import AppKit

final class UploaderApp: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: NSWindow!
    let status = NSTextField(labelWithString: "Reading Finder selection…")
    let detail = NSTextField(labelWithString: "")
    let progress = NSProgressIndicator()
    let log = NSTextView()
    let cancel = NSButton(title: "Cancel", target: nil, action: nil)
    let copy = NSButton(title: "Copy CDN URLs", target: nil, action: nil)
    let showReport = NSButton(title: "Show report", target: nil, action: nil)
    var task: Process?
    var input: FileHandle?
    var finished = false
    var cancellationRequested = false
    var urls: [String] = []
    var report: String?

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildWindow()
        start()
    }

    func buildWindow() {
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 580, height: 390),
                          styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false)
        window.title = "Upload to CBR CDN"
        window.delegate = self
        window.isReleasedWhenClosed = false
        let root = NSView()
        window.contentView = root
        status.font = .systemFont(ofSize: 18, weight: .semibold)
        detail.font = .systemFont(ofSize: 12)
        detail.textColor = .secondaryLabelColor
        detail.lineBreakMode = .byTruncatingMiddle
        progress.isIndeterminate = true
        progress.style = .bar
        progress.startAnimation(nil)
        let scroll = NSScrollView()
        scroll.hasVerticalScroller = true
        scroll.borderType = .bezelBorder
        log.isEditable = false
        log.backgroundColor = .textBackgroundColor
        log.textColor = .labelColor
        log.font = .monospacedSystemFont(ofSize: 11, weight: .regular)
        log.isHorizontallyResizable = false
        log.autoresizingMask = [.width]
        log.textContainer?.widthTracksTextView = true
        scroll.documentView = log
        cancel.target = self; cancel.action = #selector(cancelPressed)
        copy.target = self; copy.action = #selector(copyPressed)
        showReport.target = self; showReport.action = #selector(reportPressed)
        copy.isEnabled = false; showReport.isEnabled = false
        let buttons = NSStackView(views: [showReport, copy, cancel])
        buttons.spacing = 10
        for view in [status, detail, progress, scroll, buttons] {
            view.translatesAutoresizingMaskIntoConstraints = false
            root.addSubview(view)
        }
        NSLayoutConstraint.activate([
            status.leadingAnchor.constraint(equalTo: root.leadingAnchor, constant: 22),
            status.topAnchor.constraint(equalTo: root.topAnchor, constant: 22),
            status.trailingAnchor.constraint(equalTo: root.trailingAnchor, constant: -22),
            detail.leadingAnchor.constraint(equalTo: status.leadingAnchor),
            detail.topAnchor.constraint(equalTo: status.bottomAnchor, constant: 7),
            detail.trailingAnchor.constraint(equalTo: status.trailingAnchor),
            progress.leadingAnchor.constraint(equalTo: status.leadingAnchor),
            progress.trailingAnchor.constraint(equalTo: status.trailingAnchor),
            progress.topAnchor.constraint(equalTo: detail.bottomAnchor, constant: 15),
            scroll.topAnchor.constraint(equalTo: progress.bottomAnchor, constant: 16),
            scroll.leadingAnchor.constraint(equalTo: status.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: status.trailingAnchor),
            scroll.bottomAnchor.constraint(equalTo: buttons.topAnchor, constant: -18),
            buttons.trailingAnchor.constraint(equalTo: status.trailingAnchor),
            buttons.bottomAnchor.constraint(equalTo: root.bottomAnchor, constant: -18)
        ])
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func finderSelection() throws -> [String] {
        let script = NSAppleScript(source: """
            tell application "Finder"
                set resultPaths to {}
                repeat with chosenItem in (get selection)
                    set end of resultPaths to POSIX path of (chosenItem as alias)
                end repeat
                return resultPaths
            end tell
            """)!
        var error: NSDictionary?
        let result = script.executeAndReturnError(&error)
        if error != nil {
            throw NSError(domain: "CBR", code: 1, userInfo: [NSLocalizedDescriptionKey:
                "Could not read Finder selection. Allow CBR CDN Uploader to control Finder in System Settings → Privacy & Security → Automation."])
        }
        return (1...max(1, result.numberOfItems)).compactMap { result.atIndex($0)?.stringValue }
    }

    func start() {
        finished = false; cancellationRequested = false; urls = []; report = nil
        copy.isEnabled = false; showReport.isEnabled = false
        cancel.title = "Cancel"; cancel.isEnabled = true
        log.string = ""; progress.isIndeterminate = true; progress.startAnimation(nil)
        if CommandLine.arguments.contains("--preview") {
            handle(["type": "phase", "message": "Preview — no files will be uploaded"])
            detail.stringValue = "cdn.civbattleroyale.tv"
            for i in 1...4 {
                DispatchQueue.main.asyncAfter(deadline: .now() + Double(i)) {
                    self.handle(["type": "file_done", "name": "cbrx-season5-episode35-scene0\(i).jpeg",
                                 "status": "uploaded", "completed": i, "total": 4])
                    if i == 4 { self.handle(["type": "finished", "counts": ["uploaded": 4], "urls": [], "files": []]) }
                }
            }
            return
        }
        do {
            let paths = try finderSelection()
            guard !paths.isEmpty else { fail("Select image files in Finder, then click this toolbar button."); return }
            guard let launcher = Bundle.main.url(forResource: "launcher", withExtension: "json"),
                  let config = try JSONSerialization.jsonObject(with: Data(contentsOf: launcher)) as? [String: String],
                  let python = config["python"], let worker = config["worker"], let settings = config["config"] else {
                fail("The app installation is incomplete. Run npm run cdn:setup again."); return
            }
            let process = Process()
            let output = Pipe(), control = Pipe(), errors = Pipe()
            process.executableURL = URL(fileURLWithPath: python)
            process.arguments = [worker, "upload", "--config", settings] + paths
            process.standardInput = control
            process.standardOutput = output
            process.standardError = errors
            // Never echo raw helper/CLI output into the GUI or a credential-bearing log.
            errors.fileHandleForReading.readabilityHandler = { handle in _ = handle.availableData }
            try process.run()
            task = process; input = control.fileHandleForWriting
            DispatchQueue.global(qos: .userInitiated).async {
                var buffer = Data()
                while true {
                    let chunk = output.fileHandleForReading.availableData
                    if chunk.isEmpty { break }
                    buffer.append(chunk)
                    while let end = buffer.firstIndex(of: 10) {
                        let line = buffer.prefix(upTo: end)
                        buffer.removeSubrange(...end)
                        if let event = (try? JSONSerialization.jsonObject(with: Data(line))) as? [String: Any] {
                            DispatchQueue.main.async { self.handle(event) }
                        }
                    }
                }
                process.waitUntilExit()
                errors.fileHandleForReading.readabilityHandler = nil
                DispatchQueue.main.async {
                    self.task = nil; self.input = nil
                    if !self.finished { self.fail("Upload worker stopped unexpectedly. An active transfer may have reached Bunny; check storage before retrying.") }
                }
            }
        } catch { fail(error.localizedDescription) }
    }

    func send(_ action: String) {
        guard let input else { return }
        do {
            var data = try JSONSerialization.data(withJSONObject: ["action": action])
            data.append(10)
            try input.write(contentsOf: data)
        } catch { fail("Could not send the upload decision. Check storage before retrying.") }
    }

    func append(_ text: String) {
        log.textStorage?.append(NSAttributedString(string: text + "\n", attributes: [
            .font: NSFont.monospacedSystemFont(ofSize: 11, weight: .regular), .foregroundColor: NSColor.labelColor]))
        log.scrollToEndOfDocument(nil)
    }

    func handle(_ event: [String: Any]) {
        switch event["type"] as? String {
        case "phase": status.stringValue = event["message"] as? String ?? "Checking…"
        case "plan":
            if cancellationRequested { send("cancel"); return }
            let files = event["files"] as? [[String: Any]] ?? []
            detail.stringValue = "\(files.count) files → \(event["destination"] as? String ?? "CBR CDN")"
            for item in event["unsupported"] as? [[String: Any]] ?? [] {
                append("Skipped: \(item["name"] as? String ?? "file") — \(item["message"] as? String ?? "unsupported")")
            }
            let conflicts = event["conflicts"] as? [String] ?? []
            if conflicts.isEmpty { send("skip"); return }
            let alert = NSAlert()
            alert.messageText = "\(conflicts.count) filenames already exist on the CDN"
            alert.informativeText = "Choose whether to preserve or replace the existing files. New files will upload with either choice."
            alert.addButton(withTitle: "Skip existing")
            alert.addButton(withTitle: "Replace existing")
            alert.addButton(withTitle: "Cancel batch")
            let scroll = NSScrollView(frame: NSRect(x: 0, y: 0, width: 430, height: 170))
            scroll.hasVerticalScroller = true
            let text = NSTextView(frame: scroll.bounds)
            text.isEditable = false; text.string = conflicts.joined(separator: "\n")
            text.font = .monospacedSystemFont(ofSize: 11, weight: .regular)
            text.textContainer?.widthTracksTextView = true
            scroll.documentView = text; alert.accessoryView = scroll
            let choice = alert.runModal()
            send(choice == .alertFirstButtonReturn ? "skip" : choice == .alertSecondButtonReturn ? "replace" : "cancel")
        case "uploading":
            progress.isIndeterminate = false
            progress.minValue = 0; progress.maxValue = Double(event["total"] as? Int ?? 1)
            progress.doubleValue = Double(event["completed"] as? Int ?? 0)
            status.stringValue = "Uploading images…"
        case "file_started": detail.stringValue = event["name"] as? String ?? "Uploading…"
        case "file_done":
            progress.isIndeterminate = false
            progress.maxValue = Double(event["total"] as? Int ?? 1)
            progress.doubleValue = Double(event["completed"] as? Int ?? 0)
            append("\(event["status"] as? String ?? "done"): \(event["name"] as? String ?? "file")")
        case "finished":
            finished = true; progress.stopAnimation(nil); progress.isIndeterminate = false
            progress.doubleValue = progress.maxValue
            cancel.title = "Close"; cancel.isEnabled = true
            urls = event["urls"] as? [String] ?? []
            report = event["report"] as? String
            copy.isEnabled = !urls.isEmpty; showReport.isEnabled = report != nil
            let counts = event["counts"] as? [String: Int] ?? [:]
            let warnings = (counts["failed"] ?? 0) + (counts["uncertain"] ?? 0) + (event["purge_failures"] as? Int ?? 0)
            status.stringValue = CommandLine.arguments.contains("--preview") ? "Preview complete — no files uploaded" : event["cancelled"] as? Bool == true ? "Upload cancelled" : warnings > 0 ? "Finished — some files need attention" : "Upload complete"
            detail.stringValue = "\(counts["uploaded"] ?? 0) uploaded · \(counts["replaced"] ?? 0) replaced · \(counts["skipped"] ?? 0) skipped · \((counts["failed"] ?? 0) + (counts["uncertain"] ?? 0)) failed/uncertain"
            if warnings > 0 { append("Open the report for errors, interrupted transfers, or cache refresh warnings.") }
        case "error": fail(event["message"] as? String ?? "Upload could not start.")
        default: break
        }
    }

    func fail(_ message: String) {
        finished = true; status.stringValue = "Upload needs attention"
        detail.stringValue = ""; append(message)
        progress.stopAnimation(nil); progress.isIndeterminate = false
        cancel.title = "Close"; cancel.isEnabled = true
    }

    @objc func cancelPressed() {
        if finished { NSApp.terminate(nil); return }
        cancellationRequested = true
        send("cancel"); cancel.isEnabled = false; status.stringValue = "Stopping uploads…"
    }
    @objc func copyPressed() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(urls.joined(separator: "\n"), forType: .string)
    }
    @objc func reportPressed() {
        if let report { NSWorkspace.shared.open(URL(fileURLWithPath: report)) }
    }
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if !finished { cancelPressed(); return false }
        NSApp.terminate(nil); return true
    }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        window.makeKeyAndOrderFront(nil)
        if finished && task == nil { start() }
        return true
    }
}

func createIcon(_ path: String) {
    let directory = URL(fileURLWithPath: path)
    try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    for size in [16, 32, 128, 256, 512] {
        for scale in [1, 2] {
            let pixels = size * scale
            guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixels, pixelsHigh: pixels,
                                               bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
                                               isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
                  let context = NSGraphicsContext(bitmapImageRep: bitmap) else { continue }
            NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = context
            context.cgContext.scaleBy(x: CGFloat(pixels)/512, y: CGFloat(pixels)/512)
            NSColor.systemOrange.setFill()
            NSBezierPath(roundedRect: NSRect(x: 18, y: 18, width: 476, height: 476), xRadius: 100, yRadius: 100).fill()
            if let symbol = NSImage(systemSymbolName: "arrow.up.doc.fill", accessibilityDescription: nil) {
                let image = symbol.withSymbolConfiguration(.init(pointSize: 300, weight: .semibold)) ?? symbol
                image.draw(in: NSRect(x: 115, y: 95, width: 282, height: 322))
            }
            NSGraphicsContext.restoreGraphicsState()
            let name = "icon_\(size)x\(size)\(scale == 2 ? "@2x" : "").png"
            if let data = bitmap.representation(using: .png, properties: [:]) { try? data.write(to: directory.appendingPathComponent(name)) }
        }
    }
}

if CommandLine.arguments.count == 3 && CommandLine.arguments[1] == "--make-icon" {
    createIcon(CommandLine.arguments[2])
} else {
    let app = NSApplication.shared
    let delegate = UploaderApp()
    app.delegate = delegate
    app.setActivationPolicy(.regular)
    app.run()
}
