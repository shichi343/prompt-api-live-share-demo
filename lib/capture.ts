const MAX_WIDTH = 720;
const JPEG_QUALITY = 0.6;

export async function startCapture(
  streamRef: React.MutableRefObject<MediaStream | null>
) {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });
  streamRef.current = stream;
}

export function stopCapture(
  streamRef: React.MutableRefObject<MediaStream | null>
) {
  if (streamRef.current) {
    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }
    streamRef.current = null;
  }
}

export async function captureFrame(
  streamRef: React.MutableRefObject<MediaStream | null>
) {
  if (!streamRef.current) {
    throw new Error("共有が開始されていません");
  }
  const [track] = streamRef.current.getVideoTracks();
  const imageCapture = new ImageCapture(track);
  const bitmap = await imageCapture.grabFrame();

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  canvas.width = Math.floor(bitmap.width * scale);
  canvas.height = Math.floor(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvasが利用できません");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return dataUrl;
}
