export default function sharpDisabled() {
  throw new Error('Image processing is disabled in the read-only free-tier preview.')
}
