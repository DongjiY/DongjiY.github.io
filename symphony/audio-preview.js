/**
 * Audio preview component that plays a hidden YouTube embed.
 * url: YouTube shareable URL (not the embedded URL)
 * start: start timestamp as seconds, m:ss, or h:mm:ss; empty fields are 0
 * end: end timestamp as seconds, m:ss, or h:mm:ss; empty fields are 0
 * label: text displayed beside the playback button
 */
let youtubeApiPromise;
const audioPreviewStylesheetUrl = new URL(
  "audio-preview.css",
  document.currentScript.src,
).href;

function parseTimestamp(timestamp) {
  const parts = String(timestamp).trim().split(":");
  if (parts.length > 3 || parts.every((part) => part === "")) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }

  const values = parts.map((part) => {
    if (part === "") return 0;
    if (!/^\d+$/.test(part)) throw new Error(`Invalid timestamp: ${timestamp}`);
    return Number(part);
  });

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (values.length === 3) {
    [hours, minutes, seconds] = values;
  } else if (values.length === 2) {
    [minutes, seconds] = values;
  } else {
    [seconds] = values;
  }

  if (minutes >= 60 || seconds >= 60) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }

  return hours * 60 * 60 + minutes * 60 + seconds;
}

function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = reject;
    document.head.append(script);
  });

  return youtubeApiPromise;
}

class AudioPreview extends HTMLElement {
  static observedAttributes = ["start", "end", "url", "label"];

  #attributes = { start: null, end: null, url: null, label: null };
  #player = null;
  #progressTimer = null;
  #elements = {};

  attributeChangedCallback(name, _, newValue) {
    this.#attributes[name] = newValue;
    if (name === "label" && this.#elements.label) {
      this.#elements.label.textContent = newValue ?? "";
    }
  }

  get url() {
    if (!this.#attributes.url) throw new Error("URL must be defined");

    const source = new URL(this.#attributes.url);
    const videoId =
      source.hostname === "youtu.be"
        ? source.pathname.slice(1)
        : source.pathname.startsWith("/embed/")
          ? source.pathname.split("/")[2]
          : source.searchParams.get("v");

    if (!videoId) throw new Error("URL must identify a YouTube video");

    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
    embedUrl.searchParams.set("enablejsapi", "1");
    embedUrl.searchParams.set("origin", window.location.origin);
    embedUrl.searchParams.set("playsinline", "1");
    embedUrl.searchParams.set("controls", "0");

    if (this.#attributes.start) {
      embedUrl.searchParams.set("start", String(this.#start));
    }
    if (this.#attributes.end) {
      embedUrl.searchParams.set("end", String(this.#end));
    }

    return embedUrl.href;
  }

  get #start() {
    return this.#attributes.start ? parseTimestamp(this.#attributes.start) : 0;
  }

  get #end() {
    return this.#attributes.end
      ? parseTimestamp(this.#attributes.end)
      : this.#player?.getDuration() ?? 0;
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = audioPreviewStylesheetUrl;

    const youtubeEmbed = document.createElement("iframe");
    youtubeEmbed.className = "youtube-embed";
    youtubeEmbed.width = 200;
    youtubeEmbed.height = 200;
    youtubeEmbed.title = "YouTube audio player";
    youtubeEmbed.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    youtubeEmbed.referrerPolicy = "strict-origin-when-cross-origin";
    youtubeEmbed.allowFullscreen = true;
    youtubeEmbed.src = this.url;

    const playButton = document.createElement("button");
    playButton.className = "play-button";
    playButton.type = "button";
    playButton.disabled = true;
    playButton.setAttribute("aria-label", "Play audio preview");
    playButton.addEventListener("click", () => this.#togglePlayback());

    const label = document.createElement("span");
    label.className = "audio-label";
    label.textContent = this.#attributes.label ?? "";

    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
    progressBar.setAttribute("role", "progressbar");
    progressBar.setAttribute("aria-label", "Audio preview progress");
    progressBar.setAttribute("aria-valuemin", "0");
    progressBar.setAttribute("aria-valuemax", "100");
    progressBar.setAttribute("aria-valuenow", "0");

    const progress = document.createElement("div");
    progress.className = "progress";
    progressBar.append(progress);

    this.#elements = { youtubeEmbed, playButton, label, progressBar, progress };
    this.#setButtonIcon("play");
    shadow.append(stylesheet, youtubeEmbed, playButton, label, progressBar);

    loadYoutubeApi()
      .then((YT) => {
        if (!this.isConnected) return;

        this.#player = new YT.Player(youtubeEmbed, {
          events: {
            onReady: (event) => this.#onPlayerReady(event),
            onStateChange: (event) => this.#onPlayerStateChange(event),
          },
        });
      })
      .catch(() => {
        playButton.textContent = "Unavailable";
      });
  }

  disconnectedCallback() {
    this.#stopProgressTimer();
    this.#player?.destroy();
    this.#player = null;
  }

  #onPlayerReady(event) {
    this.#player = event.target;
    this.#setLoading(false);
    this.#updateProgress();
  }

  #onPlayerStateChange(event) {
    if (event.data === window.YT.PlayerState.BUFFERING) {
      this.#setLoading(true);
      this.#stopProgressTimer();
      return;
    }
    if (event.data === window.YT.PlayerState.UNSTARTED) return;

    const isPlaying = event.data === window.YT.PlayerState.PLAYING;
    this.#setLoading(false);
    this.#setButtonIcon(isPlaying ? "pause" : "play");
    this.#elements.playButton.setAttribute(
      "aria-label",
      isPlaying ? "Pause audio preview" : "Play audio preview",
    );

    if (isPlaying) {
      this.#startProgressTimer();
    } else {
      this.#stopProgressTimer();
      this.#updateProgress();
    }
  }

  #setButtonIcon(icon) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");

    const path = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    path.setAttribute(
      "d",
      icon === "pause" ? "M6 5h4v14H6zm8 0h4v14h-4z" : "M8 5v14l11-7z",
    );
    path.setAttribute("fill", "currentColor");
    svg.append(path);

    this.#elements.playButton.replaceChildren(svg);
  }

  #setLoading(isLoading) {
    const { playButton } = this.#elements;
    playButton.classList.toggle("is-loading", isLoading);
    playButton.disabled = isLoading;
    playButton.toggleAttribute("aria-busy", isLoading);

    if (isLoading) {
      playButton.setAttribute("aria-label", "Loading audio preview");
    }
  }

  #togglePlayback() {
    if (!this.#player) return;

    if (this.#player.getPlayerState() === window.YT.PlayerState.PLAYING) {
      this.#player.pauseVideo();
      return;
    }

    if (this.#player.getCurrentTime() >= this.#end) {
      this.#player.seekTo(this.#start, true);
    }
    this.#setLoading(true);
    this.#player.playVideo();
  }

  #startProgressTimer() {
    this.#stopProgressTimer();
    this.#progressTimer = window.setInterval(() => this.#updateProgress(), 250);
  }

  #stopProgressTimer() {
    if (!this.#progressTimer) return;
    window.clearInterval(this.#progressTimer);
    this.#progressTimer = null;
  }

  #updateProgress() {
    if (!this.#player) return;

    const currentTime = this.#player.getCurrentTime();
    const duration = this.#end - this.#start;
    if (duration <= 0) return;

    const percent = Math.min(
      100,
      Math.max(0, ((currentTime - this.#start) / duration) * 100),
    );
    this.#elements.progress.style.width = `${percent}%`;
    this.#elements.progressBar.setAttribute(
      "aria-valuenow",
      String(Math.round(percent)),
    );

    if (this.#attributes.end && currentTime >= this.#end) {
      this.#player.pauseVideo();
    }
  }
}

customElements.define("audio-preview", AudioPreview);
