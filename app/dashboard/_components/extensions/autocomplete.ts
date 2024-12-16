import { Extension } from '@tiptap/core'

export const AutocompleteExtension = Extension.create({
  name: 'autocomplete',
  
  addStorage() {
    return {
      suggestion: '',
      isShowingSuggestion: false,
      lastProcessedContent: '',
    }
  },

  addKeyboardShortcuts() {
    return {
      'Tab': () => {
        if (this.storage.isShowingSuggestion) {
          this.storage.isShowingSuggestion = false
          this.storage.lastProcessedContent = this.editor.getText()
          return true
        }
        return false
      },
      'Escape': () => {
        if (this.storage.isShowingSuggestion) {
          this.editor.commands.undo()
          this.storage.isShowingSuggestion = false
          return true
        }
        return false
      }
    }
  }
}) 