/**
 * AudioProvider — base class for all audio source providers.
 *
 * Every provider must implement:
 *   search(query)           → Promise<Track[]>
 *   getAudioStream(track)   → Promise<string>  (playable URL)
 *
 * Track shape (kept compatible with existing backend):
 * {
 *   videoId:      string,   // unique ID (JioSaavn id / YouTube id / …)
 *   title:        string,
 *   channelTitle: string,
 *   thumbnail:    string,
 *   audioUrl:     string,
 *   source:       string,   // "jiosaavn" | "invidious" | …
 * }
 */
export class AudioProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Search for tracks matching the query.
   * @param {string} query
   * @returns {Promise<Array>} tracks
   */
  async search(query) {
    throw new Error(`${this.name}: search() not implemented`);
  }

  /**
   * Resolve a playable audio URL for the given track.
   * @param {object} track
   * @returns {Promise<string>} audio URL
   */
  async getAudioStream(track) {
    throw new Error(`${this.name}: getAudioStream() not implemented`);
  }
}
