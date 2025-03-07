class NoteBoard {
  constructor() {
    this.notesPerPage = 3;
    this.currentPage = 1;
    this.fontSizes = ["12px", "14px", "16px", "18px", "20px"];
    this.currentFontSize = "16px";
    this.replyToId = null; // Track if we're in reply mode
    this.initialize();
  }

  // Array of light/pastel colors
  lightColors = [
    "#FFE4E1", // Misty Rose
    "#E6E6FA", // Lavender
    "#F0FFF0", // Honeydew
    "#F0F8FF", // Alice Blue
    "#FFF0F5", // Lavender Blush
    "#F5F5DC", // Beige
    "#FAFAD2", // Light Goldenrod
    "#E0FFFF", // Light Cyan
    "#FFE4B5", // Moccasin
    "#F0FFFF", // Azure
    "#FFF5EE", // Seashell
    "#F5FFFA", // Mint Cream
    "#FFFACD", // Lemon Chiffon
    "#E6FFE6", // Light Mint
    "#FFE4E6", // Light Pink
    "#F0E6FF", // Light Purple
    "#E6FFFA", // Light Teal
    "#FFF5E6", // Light Orange
  ];

  getRandomLightColor() {
    return this.lightColors[
      Math.floor(Math.random() * this.lightColors.length)
    ];
  }

  async initialize() {
    try {
      // Check authentication first
      const {
        data: { session },
        error: authError,
      } = await supabaseClient.auth.getSession();
      if (authError) throw authError;
      if (!session) {
        console.log("No active session");
        this.notesContainer.innerHTML =
          '<div class="error-message">Please log in to view notes.</div>';
        return;
      }

      // Add global handler for reply buttons
      window.handleNoteReply = (noteId) => {
        console.log("Global reply handler called with noteId:", noteId);
        if (this && typeof this.showReplyInput === "function") {
          this.showReplyInput(noteId);
        } else {
          console.error("NoteBoard instance or showReplyInput not available");
        }
      };

      this.addNoteBtn = document.getElementById("addNote");
      this.newNoteInput = document.getElementById("newNote");
      this.notesContainer = document.getElementById("notes");

      if (!this.addNoteBtn || !this.newNoteInput || !this.notesContainer) {
        console.error("Required DOM elements not found:", {
          addNoteBtn: !!this.addNoteBtn,
          newNoteInput: !!this.newNoteInput,
          notesContainer: !!this.notesContainer,
        });
        return;
      }

      // Add font size control and emoji picker
      this.addInputControls();

      // Add event listeners
      this.addNoteBtn.addEventListener("click", () => this.handleSubmit());
      this.newNoteInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSubmit();
        }
      });

      // Add direct event listeners for emoji button and picker
      const emojiButton = document.querySelector(".emoji-button");
      const emojiPicker = document.querySelector(".emoji-picker");
      if (emojiButton && emojiPicker) {
        emojiButton.addEventListener("click", (e) => {
          e.stopPropagation();
          emojiPicker.style.display =
            emojiPicker.style.display === "none" || !emojiPicker.style.display
              ? "flex"
              : "none";
        });

        // Add click handlers for emoji options
        emojiPicker.querySelectorAll(".emoji-option").forEach((option) => {
          option.addEventListener("click", (e) => {
            this.insertEmoji(this.newNoteInput, e.target.textContent);
            emojiPicker.style.display = "none";
          });
        });

        // Close emoji picker when clicking outside
        document.addEventListener("click", (e) => {
          if (
            !e.target.closest(".emoji-button") &&
            !e.target.closest(".emoji-picker")
          ) {
            emojiPicker.style.display = "none";
          }
        });
      }

      // Load notes after everything is initialized
      await this.loadNotes();
      this.setupRealtimeSubscription();
    } catch (error) {
      console.error("Error in initialize:", error);
      if (this.notesContainer) {
        this.notesContainer.innerHTML =
          '<div class="error-message">Error initializing note board: ' +
          error.message +
          "</div>";
      }
    }
  }

  setupEventDelegation() {
    // Handle font size changes only
    document.addEventListener("change", (e) => {
      if (e.target.classList.contains("font-size-control")) {
        this.newNoteInput.style.fontSize = e.target.value;
        this.currentFontSize = e.target.value;
      }
    });
  }

  addInputControls() {
    // Create controls container
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "note-input-controls";

    // Add font size control
    const fontSizeSelect = document.createElement("select");
    fontSizeSelect.className = "font-size-control";
    this.fontSizes.forEach((size) => {
      const option = document.createElement("option");
      option.value = size;
      option.textContent = size;
      if (size === this.currentFontSize) option.selected = true;
      fontSizeSelect.appendChild(option);
    });

    // Add event listener for font size changes
    fontSizeSelect.addEventListener("change", (e) => {
      const size = e.target.value;
      // Remove all font size classes
      this.newNoteInput.classList.remove(
        ...this.fontSizes.map((s) => `font-size-${s.replace("px", "")}`)
      );
      // Add the selected font size class
      this.newNoteInput.classList.add(`font-size-${size.replace("px", "")}`);
      this.currentFontSize = size;
    });

    // Create emoji button
    const emojiBtn = document.createElement("button");
    emojiBtn.type = "button";
    emojiBtn.className = "emoji-button";
    emojiBtn.innerHTML = "😊";
    emojiBtn.title = "Insert emoji";

    // Create emoji picker container
    const emojiPicker = document.createElement("div");
    emojiPicker.className = "emoji-picker";
    emojiPicker.style.display = "none";
    emojiPicker.innerHTML = this.createEmojiPickerHTML();

    // Add controls to the container
    controlsDiv.appendChild(fontSizeSelect);
    controlsDiv.appendChild(emojiBtn);
    controlsDiv.appendChild(emojiPicker);

    // Add to DOM
    const inputSection = this.newNoteInput.parentElement;
    inputSection.insertBefore(controlsDiv, this.addNoteBtn);

    // Set initial font size
    this.newNoteInput.style.fontSize = this.currentFontSize;
  }

  async loadNotes() {
    try {
      console.log("Loading notes...");
      // First, get all parent notes (notes with null or empty reply_to)
      const { data: parentNotes, error: parentError } = await supabaseClient
        .from("notes")
        .select("*")
        .or("reply_to.is.null,reply_to.eq.") // Handle both null and empty string
        .order("created_at", { ascending: false });

      if (parentError) {
        console.error("Error loading parent notes:", parentError);
        throw parentError;
      }

      console.log("Loaded parent notes:", parentNotes);

      // Then, get all replies (notes with non-null and non-empty reply_to)
      const { data: replies, error: repliesError } = await supabaseClient
        .from("notes")
        .select("*")
        .not("reply_to", "is", null)
        .neq("reply_to", "")
        .order("created_at", { ascending: true });

      if (repliesError) {
        console.error("Error loading replies:", repliesError);
        throw repliesError;
      }

      console.log("Loaded replies:", replies);

      // Initialize empty array if no parent notes
      const notesWithReplies = parentNotes
        ? parentNotes.map((note) => ({
            ...note,
            replies: replies
              ? replies.filter((reply) => reply.reply_to === note.id)
              : [],
          }))
        : [];

      console.log("Processed notes with replies:", notesWithReplies);
      this.renderNotes(notesWithReplies);
    } catch (error) {
      console.error("Error in loadNotes:", error);
      if (this.notesContainer) {
        // Check if it's an authentication error
        if (error.message?.includes("authentication")) {
          this.notesContainer.innerHTML =
            '<div class="error-message">Please log in to view notes.</div>';
        } else {
          this.notesContainer.innerHTML =
            '<div class="error-message">Failed to load notes. Error: ' +
            error.message +
            "</div>";
        }
      }
    }
  }

  renderNotes(notes) {
    console.log("Starting renderNotes with", notes.length, "notes");
    if (!this.notesContainer) {
      console.error("Notes container not found");
      return;
    }

    const startIndex = (this.currentPage - 1) * this.notesPerPage;
    const endIndex = startIndex + this.notesPerPage;
    const pageNotes = notes.slice(startIndex, endIndex);
    console.log("Rendering page notes:", pageNotes.length);

    if (pageNotes.length === 0) {
      this.notesContainer.innerHTML =
        '<div class="no-notes">No notes yet. Be the first to add one!</div>';
      return;
    }

    this.notesContainer.innerHTML = `
      <div class="notes-container">
        ${pageNotes.map((note) => this.createNoteHTML(note)).join("")}
      </div>
      ${this.createPaginationHTML(notes.length)}
    `;
    console.log("Notes HTML updated");

    // Add event listeners for pagination
    document.querySelectorAll(".pagination button").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.page) {
          this.currentPage = parseInt(button.dataset.page);
          this.renderNotes(notes);
          this.notesContainer.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }

  createNoteHTML(note) {
    console.log("Creating HTML for note:", note.id);
    const content = note.note_board || "";
    const userEmail = note.user_email || "Anonymous";
    const createdAt = note.created_at
      ? new Date(note.created_at).toLocaleString()
      : "";
    const fontSize = note.font_size || "16px";

    return `
      <div class="sticky-note" style="background-color: ${this.getRandomLightColor()}" data-note-id="${
      note.id
    }">
        <div class="note-metadata">
          <span class="note-author">${this.escapeHtml(userEmail)}</span>
          <span class="note-date">${createdAt}</span>
        </div>
        <div class="note-content" style="font-size: ${fontSize}">${this.escapeHtml(
      content
    )}</div>
        <div class="note-actions">
          <button type="button" class="reply-button" data-note-id="${
            note.id
          }" onclick="handleNoteReply('${note.id}')">Reply</button>
        </div>
        ${this.createRepliesHTML(note.replies)}
      </div>
    `;
  }

  createRepliesHTML(replies) {
    if (!replies || replies.length === 0) return "";

    return `
      <div class="reply-list">
        ${replies
          .map((reply) => {
            const content = reply.note_board || "";
            const userEmail = reply.user_email || "Anonymous";
            const createdAt = reply.created_at
              ? new Date(reply.created_at).toLocaleString()
              : "";
            const fontSize = reply.font_size || "16px";

            return `
            <div class="reply-item" style="background-color: ${this.getRandomLightColor()}">
              <div class="reply-content" style="font-size: ${fontSize}">${this.escapeHtml(
              content
            )}</div>
              <div class="reply-metadata">
                <span class="reply-author">${this.escapeHtml(userEmail)}</span>
                <span class="reply-date">${createdAt}</span>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  createPaginationHTML(totalNotes) {
    const totalPages = Math.ceil(totalNotes / this.notesPerPage);
    if (totalPages <= 1) return "";

    let buttons = [];
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(`
        <button 
          data-page="${i}" 
          class="${this.currentPage === i ? "active" : ""}"
        >${i}</button>
      `);
    }

    return `<div class="pagination">${buttons.join("")}</div>`;
  }

  showReplyInput(noteId) {
    console.log("showReplyInput called with noteId:", noteId);
    this.replyToId = noteId;
    console.log("replyToId set to:", this.replyToId);

    this.newNoteInput.value = "";
    this.newNoteInput.placeholder = "Write a reply...";
    this.newNoteInput.focus();
    this.addNoteBtn.textContent = "Reply";
    console.log("Input field updated for reply mode");

    // Create cancel button if it doesn't exist
    if (!this.cancelReplyBtn) {
      console.log("Creating cancel button");
      this.cancelReplyBtn = document.createElement("button");
      this.cancelReplyBtn.id = "cancelReply";
      this.cancelReplyBtn.textContent = "Cancel";
      this.cancelReplyBtn.onclick = () => this.cancelReply();
      this.addNoteBtn.parentNode.insertBefore(
        this.cancelReplyBtn,
        this.addNoteBtn.nextSibling
      );
    }
    this.cancelReplyBtn.style.display = "inline-block";
    this.newNoteInput.scrollIntoView({ behavior: "smooth" });
    console.log("Reply mode setup complete");
  }

  cancelReply() {
    this.replyToId = null;
    this.addNoteBtn.textContent = "Add Note";
    this.newNoteInput.value = "";
    this.newNoteInput.placeholder = "Add a new note...";
    if (this.cancelReplyBtn) {
      this.cancelReplyBtn.style.display = "none";
    }
  }

  async handleSubmit() {
    console.log("handleSubmit called, replyToId:", this.replyToId);
    const content = this.newNoteInput.value.trim();
    if (!content) return;

    try {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      const noteData = {
        note_board: content,
        user_email: user.email,
        font_size: this.currentFontSize,
        reply_to: this.replyToId || null, // Use null instead of empty string
      };

      console.log("Submitting note data:", noteData);
      const { error } = await supabaseClient.from("notes").insert(noteData);
      if (error) throw error;

      console.log("Note/reply submitted successfully");
      this.newNoteInput.value = "";
      if (this.replyToId) {
        this.cancelReply();
      }

      this.loadNotes();
    } catch (error) {
      console.error("Error adding note/reply:", error);
      alert("Failed to add note/reply. Please try again.");
    }
  }

  setupRealtimeSubscription() {
    try {
      const channel = supabaseClient
        .channel("notes_channel")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notes",
          },
          (payload) => {
            console.log("Real-time update received:", payload);
            this.loadNotes();
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("Successfully subscribed to real-time updates");
          } else {
            console.log("Subscription status:", status);
          }
        });

      // Store channel reference for cleanup
      this.realtimeChannel = channel;
    } catch (error) {
      console.error("Error setting up realtime subscription:", error);
    }
  }

  cleanup() {
    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.unsubscribe();
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    }
  }

  escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  createEmojiPickerHTML() {
    const emojis = [
      "😊",
      "👍",
      "❤️",
      "🎉",
      "✨",
      "🌟",
      "💡",
      "📝",
      "⭐",
      "🔥",
      "👏",
      "💪",
      "🙌",
      "🎯",
      "✅",
    ];
    return emojis
      .map((emoji) => `<span class="emoji-option">${emoji}</span>`)
      .join("");
  }

  insertEmoji(textarea, emoji) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);

    textarea.value = before + emoji + after;
    textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    textarea.focus();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.noteBoard = new NoteBoard();
});
