import { getSupabaseClient, SUPABASE_ALBUM_COMMENTS_TABLE } from "../../../supabaseClient";
import {
  COMMENT_FALLBACK_PRIMARY,
  COMMENT_FALLBACK_SECONDARY,
  COMMENT_MAX_LENGTH,
  SEASON_FIVE_PR_COMMENT_CUTOFF,
  COMMENT_WINDOW_DAYS,
} from "./albumSettings.js";
import { normalizeOwnerKey, OWNER_COLOR_MAP } from "../../../../data/civColors.mjs";
import { commentRestriction } from '../../../account/featureAvailability.mjs';

// album Comments. Methods run on the owning Vue component instance.

export const albumCommentsComputed = {
  showComments() {
    return this.isPowerRanking || this.isSeasonFive;
  },
  shouldShowComments() {
    return this.showComments && (!this.isToggle || this.isFinalScene);
  },
  commentPostedAt() {
    const frontmatter = (this.$page && this.$page.frontmatter) || {};
    const rawCandidates = this.isPowerRanking
      ? [frontmatter.date]
      : [frontmatter.release_date, frontmatter.date];
    for (const raw of rawCandidates) {
      if (!raw) {
        continue;
      }
      const date = new Date(raw);
      if (Number.isFinite(date.getTime())) {
        return date;
      }
    }
    return null;
  },
  commentWindowEndsAt() {
    if (!this.showComments) {
      return null;
    }
    if (this.isPowerRanking && this.isSeasonFive) {
      if (!this.commentPostedAt) {
        return SEASON_FIVE_PR_COMMENT_CUTOFF;
      }
      const regularEnd = new Date(
        this.commentPostedAt.getTime() +
          COMMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
      );
      return regularEnd > SEASON_FIVE_PR_COMMENT_CUTOFF
        ? regularEnd
        : SEASON_FIVE_PR_COMMENT_CUTOFF;
    }
    if (!this.commentPostedAt) {
      return null;
    }
    return new Date(
      this.commentPostedAt.getTime() +
        COMMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );
  },
  commentWindowOpen() {
    if (!this.showComments) {
      return false;
    }
    if (!this.commentWindowEndsAt) {
      return this.isPowerRanking;
    }
    return (this.commentNow || Date.now()) <= this.commentWindowEndsAt.getTime();
  },
  commentWindowLabel() {
    if (!this.showComments) {
      return "";
    }
    if (!this.commentWindowEndsAt) {
      return "";
    }
    return this.commentWindowEndsAt.toLocaleDateString();
  },
  canSupporterComment() {
    return Boolean(this.authProfile && this.authProfile.can_edit);
  },
  commentAccessNotice() {
    return commentRestriction({ windowOpen: this.commentWindowOpen, closesLabel: this.commentWindowLabel,
      powerRanking: this.isPowerRanking, signedIn: !!this.authUser, allowed: this.canSupporterComment,
      checking: this.supporterChecking, failed: this.supporterCheckFailed, status: this.authProfile?.supporter_status });
  },
  userComment() {
    if (!this.authUser) {
      return null;
    }
    return (
      this.comments.find((comment) => comment.user_id === this.authUser.id) ||
      null
    );
  },
  commentMaxLength() {
    return COMMENT_MAX_LENGTH;
  },
  canSubmitComment() {
    if (!this.commentPreview || !this.commentPreview.message) {
      return false;
    }
    const current = String(this.commentDraft || "").trim();
    return current && this.commentPreview.message === current;
  },
};

export const albumCommentsMethods = {
  refreshCommentWindow() {
    this.commentNow = Date.now();
    if (typeof window === 'undefined') return;
    window.clearTimeout(this._commentWindowTimer);
    const remaining = this.commentWindowEndsAt?.getTime() - this.commentNow;
    if (remaining >= 0) {
      this._commentWindowTimer = window.setTimeout(() => this.refreshCommentWindow(), Math.min(remaining + 1, 2147483647));
    }
  },
  setCommentMessage(message, type = "info") {
    this.commentMessage = message;
    this.commentMessageType = type;
  },
  clearCommentMessage() {
    this.commentMessage = "";
    this.commentMessageType = "info";
  },
  async loadComments() {
    if (typeof window === "undefined") {
      return;
    }
    if (!this.showComments) {
      return;
    }
    if (!this.supabase) {
      this.supabase = getSupabaseClient();
    }
    if (!this.supabase || this.commentsLoading) {
      return;
    }
    this.commentsLoading = true;
    try {
      const { data, error } = await this.supabase
        .from(SUPABASE_ALBUM_COMMENTS_TABLE)
        .select(
          "id, user_id, username, message, civ_label, civ_primary, civ_secondary, flair, created_at, updated_at"
        )
        .eq("page_path", this.$page.path)
        .order("created_at", { ascending: true });
      if (error) {
        console.warn("Unable to load comments.", error);
        return;
      }
      this.comments = data || [];
    } finally {
      this.commentsLoading = false;
    }
  },
  commentCivStyle(comment) {
    const primary = comment.civ_primary || COMMENT_FALLBACK_PRIMARY;
    const secondary = comment.civ_secondary || COMMENT_FALLBACK_SECONDARY;
    return {
      "--civ-primary": primary,
      "--civ-secondary": secondary,
    };
  },
  startEditComment() {
    this.refreshCommentWindow();
    if (!this.userComment) {
      return;
    }
    if (this.commentAccessNotice) {
      this.setCommentMessage(this.commentAccessNotice.message, 'error');
      return;
    }
    this.commentDraft = this.userComment.message || "";
    this.commentPreview = null;
    this.commentEditing = true;
    this.clearCommentMessage();
  },
  cancelEditComment() {
    this.commentEditing = false;
    this.commentDraft = "";
    this.commentPreview = null;
    this.clearCommentMessage();
  },
  previewComment() {
    this.refreshCommentWindow();
    if (this.commentAccessNotice) {
      this.setCommentMessage(this.commentAccessNotice.message, "error");
      return;
    }
    const message = String(this.commentDraft || "").trim();
    if (!message) {
      this.setCommentMessage("Enter a comment before previewing.", "error");
      return;
    }
    if (message.length > COMMENT_MAX_LENGTH) {
      this.setCommentMessage(
        `Comment must be ${COMMENT_MAX_LENGTH} characters or less.`,
        "error"
      );
      return;
    }
    const civLabel = String(this.favoriteCiv || "").trim();
    const civKey = civLabel ? normalizeOwnerKey(civLabel) : "";
    const colors =
      civKey && OWNER_COLOR_MAP[civKey] ? OWNER_COLOR_MAP[civKey] : null;
    const flair = String(this.customFlair || "").trim();
    const username =
      (this.authProfile && this.authProfile.username) ||
      (this.authUser && this.authUser.email) ||
      "Supporter";
    this.commentPreview = {
      message,
      username,
      civ_label: civLabel || null,
      civ_primary: colors ? colors.primary : COMMENT_FALLBACK_PRIMARY,
      civ_secondary: colors ? colors.secondary : COMMENT_FALLBACK_SECONDARY,
      flair: flair || null,
    };
    this.clearCommentMessage();
  },
  async submitComment() {
    this.refreshCommentWindow();
    if (this.commentAccessNotice) {
      this.setCommentMessage(this.commentAccessNotice.message, "error");
      return;
    }
    const message = String(this.commentDraft || "").trim();
    if (!message) {
      this.setCommentMessage("Enter a comment before posting.", "error");
      return;
    }
    if (message.length > COMMENT_MAX_LENGTH) {
      this.setCommentMessage(
        `Comment must be ${COMMENT_MAX_LENGTH} characters or less.`,
        "error"
      );
      return;
    }
    if (!this.canSubmitComment) {
      this.setCommentMessage("Preview before posting.", "info");
      return;
    }
    if (!this.supabase) {
      this.supabase = getSupabaseClient();
    }
    if (!this.supabase || this.commentSaving) {
      return;
    }
    this.commentSaving = true;
    this.clearCommentMessage();
    const now = new Date().toISOString();
    try {
      if (this.userComment) {
        const { error } = await this.supabase
          .from(SUPABASE_ALBUM_COMMENTS_TABLE)
          .update({
            message,
            updated_at: now,
          })
          .eq("id", this.userComment.id)
          .eq("user_id", this.authUser.id);
        if (error) {
          console.warn("Unable to update comment.", error);
          this.setCommentMessage("Unable to update comment.", "error");
          return;
        }
        this.commentEditing = false;
      } else {
        const civLabel = String(this.favoriteCiv || "").trim();
        const civKey = civLabel ? normalizeOwnerKey(civLabel) : "";
        const colors =
          civKey && OWNER_COLOR_MAP[civKey] ? OWNER_COLOR_MAP[civKey] : null;
        const flair = String(this.customFlair || "").trim();
        const username =
          (this.authProfile && this.authProfile.username) ||
          (this.authUser && this.authUser.email) ||
          "Supporter";
        const { error } = await this.supabase
          .from(SUPABASE_ALBUM_COMMENTS_TABLE)
          .insert({
            user_id: this.authUser.id,
            page_path: this.$page.path,
            message,
            username,
            civ_label: civLabel || null,
            civ_primary: colors ? colors.primary : COMMENT_FALLBACK_PRIMARY,
            civ_secondary: colors
              ? colors.secondary
              : COMMENT_FALLBACK_SECONDARY,
            flair: flair || null,
            updated_at: now,
          });
        if (error) {
          console.warn("Unable to save comment.", error);
          this.setCommentMessage("Unable to save comment.", "error");
          return;
        }
      }
      this.commentDraft = "";
      this.commentPreview = null;
      this.loadComments();
    } finally {
      this.commentSaving = false;
    }
  },
  async deleteComment() {
    this.refreshCommentWindow();
    if (!this.userComment || !this.authUser) {
      return;
    }
    if (this.commentAccessNotice) {
      this.setCommentMessage(this.commentAccessNotice.message, "error");
      return;
    }
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Delete your comment?");
      if (!confirmed) {
        return;
      }
    }
    if (!this.supabase) {
      this.supabase = getSupabaseClient();
    }
    const { error } = await this.supabase
      .from(SUPABASE_ALBUM_COMMENTS_TABLE)
      .delete()
      .eq("id", this.userComment.id)
      .eq("user_id", this.authUser.id);
    if (error) {
      console.warn("Unable to delete comment.", error);
      this.setCommentMessage("Unable to delete comment.", "error");
      return;
    }
    this.commentDraft = "";
    this.commentPreview = null;
    this.commentEditing = false;
    this.loadComments();
  },
};
