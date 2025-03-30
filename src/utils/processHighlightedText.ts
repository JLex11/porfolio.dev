// Function to process text with ** markers and convert them to <strong> tags
export const processHighlightedText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts
    .map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2)
        return `<strong>${content}</strong>`
      }
      return part
    })
    .join('')
}