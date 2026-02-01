<template>
  <section class="album-comments" aria-labelledby="comments-title">
    <div class="comments-header">
      <h2 id="comments-title">Supporter Comments</h2>
      <p class="comments-subtitle">
        Supporters can leave one comment within a week of release.
        <span v-if="commentWindowLabel"
          >Comments close {{ commentWindowLabel }}.</span
        >
      </p>
    </div>
    <div class="comment-form">
      <p v-if="!authUser" class="comment-note">Sign in to leave a comment.</p>
      <p v-else-if="!canSupporterComment" class="comment-note">
        Supporters only can comment.
      </p>
      <p v-else-if="!commentWindowOpen" class="comment-note">
        Comment window has closed for this episode.
      </p>
      <div v-else>
        <div
          v-if="userComment && !commentEditing"
          class="comment-note comment-note--row"
        >
          <span>You already left a comment.</span>
          <div class="comment-inline-actions" v-if="commentWindowOpen">
            <button
              type="button"
              class="comment-link"
              @click="$emit('start-edit')"
            >
              Edit comment
            </button>
            <button
              type="button"
              class="comment-link comment-link--danger"
              @click="$emit('delete-comment')"
            >
              Delete
            </button>
          </div>
        </div>
        <div v-else class="comment-editor">
          <textarea
            class="comment-input"
            :value="commentDraft"
            :maxlength="commentMaxLength"
            rows="4"
            placeholder="Post a comment for all posterity..."
            @input="$emit('update:commentDraft', $event.target.value)"
          ></textarea>
          <div class="comment-actions">
            <button
              type="button"
              class="comment-button comment-button--ghost"
              :disabled="commentSaving || !commentDraft.trim()"
              @click="$emit('preview-comment')"
            >
              Preview before Posting
            </button>
            <button
              type="button"
              class="comment-button"
              :disabled="commentSaving || !canSubmitComment"
              @click="$emit('submit-comment')"
            >
              {{ userComment ? "Update Comment" : "Post Comment" }}
            </button>
            <button
              v-if="userComment"
              type="button"
              class="comment-link"
              @click="$emit('cancel-edit')"
            >
              Cancel
            </button>
            <button
              v-if="userComment"
              type="button"
              class="comment-link comment-link--danger"
              @click="$emit('delete-comment')"
            >
              Delete
            </button>
            <span class="comment-count">
              {{ commentDraft.length }}/{{ commentMaxLength }}
            </span>
          </div>
          <div v-if="commentPreview" class="comment-preview">
            <div class="comment-preview-label">Preview</div>
            <article class="comment-card comment-card--preview">
              <div class="comment-civ" :style="commentCivStyle(commentPreview)">
                <span class="comment-civ-tooltip">
                  {{ commentPreview.civ_label || "No civ preference" }}
                </span>
              </div>
              <div class="comment-body">
                <div class="comment-header">
                  <span class="comment-name">
                    {{ commentPreview.username || "Supporter" }}
                  </span>
                  <span v-if="commentPreview.flair" class="comment-flair">
                    {{ commentPreview.flair }}
                  </span>
                </div>
                <p class="comment-text">{{ commentPreview.message }}</p>
              </div>
            </article>
          </div>
          <p
            v-if="commentMessage"
            class="comment-note"
            :class="{
              'comment-note--error': messageIsError,
              'comment-note--success': messageIsSuccess,
            }"
            :role="messageIsError ? 'alert' : 'status'"
            :aria-live="messageIsError ? 'assertive' : 'polite'"
            aria-atomic="true"
          >
            {{ commentMessage }}
          </p>
        </div>
      </div>
    </div>
    <div class="comment-list">
      <p v-if="commentsLoading" class="comment-note">Loading comments...</p>
      <p v-else-if="!comments.length" class="comment-note comment-note--empty">
        No comments yet.
      </p>
      <div v-else class="comment-cards">
        <article
          v-for="comment in comments"
          :key="comment.id"
          class="comment-card"
        >
          <div class="comment-civ" :style="commentCivStyle(comment)">
            <span class="comment-civ-tooltip">
              {{ comment.civ_label || "No civ preference" }}
            </span>
          </div>
          <div class="comment-body">
            <div class="comment-header">
              <span class="comment-name">
                {{ comment.username || "Supporter" }}
              </span>
              <span v-if="comment.flair" class="comment-flair">
                {{ comment.flair }}
              </span>
            </div>
            <p class="comment-text">{{ comment.message }}</p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: "CommentsSection",
  props: {
    authUser: {
      type: Object,
      default: null,
    },
    canSupporterComment: {
      type: Boolean,
      default: false,
    },
    commentWindowOpen: {
      type: Boolean,
      default: false,
    },
    commentWindowLabel: {
      type: String,
      default: "",
    },
    userComment: {
      type: Object,
      default: null,
    },
    commentEditing: {
      type: Boolean,
      default: false,
    },
    commentDraft: {
      type: String,
      default: "",
    },
    commentMaxLength: {
      type: Number,
      required: true,
    },
    commentSaving: {
      type: Boolean,
      default: false,
    },
    canSubmitComment: {
      type: Boolean,
      default: false,
    },
    commentPreview: {
      type: Object,
      default: null,
    },
    commentMessage: {
      type: String,
      default: "",
    },
    commentMessageType: {
      type: String,
      default: "info",
    },
    commentsLoading: {
      type: Boolean,
      default: false,
    },
    comments: {
      type: Array,
      default: () => [],
    },
    commentCivStyle: {
      type: Function,
      required: true,
    },
  },
  computed: {
    messageIsError() {
      return this.commentMessageType === "error";
    },
    messageIsSuccess() {
      return this.commentMessageType === "success";
    },
  },
};
</script>

<style scoped>
.album-comments {
  margin-block: 0 1.5rem;
  padding-block-start: 2rem;
  border-block-start: 1px solid var(--border-color);
}
.comments-header h2 {
  margin: 0;
  font-size: 1.75rem;
}
.comments-subtitle {
  color: color-mix(in srgb, var(--text-color), white 25%);
  font-size: 0.95rem;
  margin: 0.5rem 0 1rem;
}
.comment-form {
  position: relative;
  padding: 1rem;
  border: 1px solid #2b2b2b;
  border-radius: 12px;
  background: linear-gradient(145deg, #0f0f0f 0%, #171717 100%);
  margin-block-end: 1rem;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
}
.comment-input {
  inline-size: -webkit-fill-available;
  min-height: 110px;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(255, 191, 70, 0.25);
  border-radius: 8px;
  background: radial-gradient(circle at top, #161616 0%, #0b0b0b 70%);
  color: #f5f1e6;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03),
    0 6px 12px rgba(0, 0, 0, 0.25);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.comment-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent-color), white 5%);
  box-shadow: 0 0 0 2px rgba(255, 191, 70, 0.18),
    0 10px 18px rgba(0, 0, 0, 0.35);
}
.comment-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-block-start: 0.6rem;
}
.comment-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 1rem;
  border: 1px solid #f6c55b;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffbf46 0%, #f7a726 100%);
  color: #1a1a1a;
  font-weight: 800;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}
.comment-button:hover {
  border-color: #ffd27a;
  background: linear-gradient(135deg, #ffd27a 0%, #ffb13b 100%);
  transform: translateY(-1px);
}
.comment-button--ghost {
  border-color: rgba(255, 191, 70, 0.5);
  background: rgba(255, 191, 70, 0.3);
  color: #ffcf70;
  box-shadow: none;
}
.comment-button--ghost:hover {
  background: rgba(255, 191, 70, 0.4);
  transform: translateY(-1px);
}
.comment-button:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}
.comment-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}
.comment-count {
  margin-inline-start: auto;
  font-size: 0.8rem;
  color: color-mix(in srgb, var(--text-color), white 30%);
}
.comment-preview {
  margin-block-start: 0.9rem;
  padding: 0.85rem;
  border-radius: 10px;
  border: 1px dashed rgba(255, 191, 70, 0.35);
  background: #121212;
}
.comment-preview-label {
  color: color-mix(in srgb, var(--text-color), white 30%);
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-block-end: 0.6rem;
}
.comment-list {
  display: grid;
  gap: 0.8rem;
}
.comment-cards {
  display: grid;
  gap: 0.8rem;
}
.comment-card {
  display: flex;
  gap: 0.85rem;
  padding: 0.9rem 1rem;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  background: linear-gradient(145deg, #111 0%, #191919 100%);
  margin-block: 0;
}
.comment-civ {
  position: relative;
  flex: 0 0 auto;
  margin-block-start: 0.1rem;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  border-radius: 50%;
  border: 2px solid var(--civ-secondary);
  background: var(--civ-primary);
  cursor: pointer;
}
.comment-civ-tooltip {
  position: absolute;
  z-index: 10;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(255, 191, 70, 0.3);
  background: #1a1a1a;
  color: #fff;
  white-space: nowrap;
  font-size: 0.95rem;
  font-weight: 500;
  opacity: 0;
  pointer-events: none;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  inset-block-end: 100%;
  inset-inline-start: 50%;
  transform: translateX(-50%);
  transition: opacity 0.2s ease;
}
.comment-civ-tooltip::after {
  content: "";
  position: absolute;
  inline-size: 0;
  block-size: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #1a1a1a;
  filter: drop-shadow(0 1px 0px rgba(255, 191, 70, 0.3));
  inset-block-start: 100%;
  inset-inline-start: 50%;
  transform: translateX(-50%);
}
.comment-civ:hover .comment-civ-tooltip {
  opacity: 1;
}
.comment-body {
  flex: 1;
}
.comment-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-block-end: 0.25rem;
}
.comment-name {
  color: #fff;
  font-size: 1.25rem;
  font-weight: 800;
  min-width: 0;
  overflow-wrap: anywhere;
}
.comment-flair {
  padding: 0.25rem 0.75rem;
  border: 1px solid rgba(255, 191, 70, 0.35);
  border-radius: 1rem;
  background: #171717;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  text-shadow: none;
  white-space: nowrap;
}
.comment-text {
  margin: 0;
  line-height: 1.4;
  color: #f0f0f0;
  white-space: pre-line;
}
.comment-note {
  margin: 0;
  font-size: 0.9rem;
  color: color-mix(in srgb, var(--text-color), white 25%);
}
.comment-note--error {
  color: #f08c7a;
  font-weight: 700;
}
.comment-note--success {
  color: #9ad39f;
  font-weight: 700;
}
.comment-note--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
}
.comment-inline-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
}
.comment-note--empty {
  padding-block: 0.5rem;
  text-align: center;
}
.comment-link--danger {
  color: #f08c7a;
}
</style>
