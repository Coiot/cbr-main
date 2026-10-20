// Native disclosures keep normal Tab navigation; actions reuse the map's handlers.
export const toolbarDisclosureMethods = {
  onDisclosureToggle(name, event) {
    if (event.currentTarget.open) {
      const other = name === 'views' ? 'more' : 'views';
      if (this.$refs[other]) this.$refs[other].open = false;
      this.openMenu = name;
    } else if (this.openMenu === name) this.openMenu = '';
  },
  onDisclosureEscape(event) {
    if (!this.openMenu) return;
    event.preventDefault(); event.stopPropagation(); this.closeMenu(true);
  },
  closeMenu(restoreFocus = false) {
    const menu = this.$refs[this.openMenu];
    this.openMenu = '';
    if (!menu) return;
    menu.open = false;
    if (restoreFocus) menu.querySelector('summary')?.focus({ preventScroll: true });
  },
  onOutsidePointer(event) {
    if (this.openMenu && !this.$refs[this.openMenu]?.contains(event.target)) this.closeMenu();
  },
  onDisclosureFocusout(name, event) {
    if (this.openMenu === name && event.relatedTarget && !this.$refs[name]?.contains(event.relatedTarget)) this.closeMenu();
  },
  runAction(name, ...args) {
    // Focus the trigger before opening a dialog so native dialog dismissal returns here.
    this.closeMenu(true);
    this.$emit(name, ...args);
  },
};
export function savedViewSection(section) {
  return ['explore', 'following', 'mine'].includes(section) ? section : null;
}
