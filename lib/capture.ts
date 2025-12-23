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

let sharedVideo: HTMLVideoElement | null = null;

async function getVideo(streamRef: React.MutableRefObject<MediaStream | null>) {
  if (!streamRef.current) {
    throw new Error("共有が開始されていません");
  }
  if (!sharedVideo) {
    sharedVideo = document.createElement("video");
    sharedVideo.muted = true;
    sharedVideo.playsInline = true;
    sharedVideo.autoplay = true;
  }
  if (sharedVideo.srcObject !== streamRef.current) {
    sharedVideo.srcObject = streamRef.current;
    try {
      await sharedVideo.play();
    } catch {
      // autoplayエラーは無視
    }
  }
  if (sharedVideo.readyState < 2) {
    await new Promise<void>((resolve) => {
      const onLoaded = () => {
        sharedVideo?.removeEventListener("loadeddata", onLoaded);
        resolve();
      };
      sharedVideo?.addEventListener("loadeddata", onLoaded);
    });
  }
  return sharedVideo;
}

export async function captureFrame(
  streamRef: React.MutableRefObject<MediaStream | null>
): Promise<Blob> {
  const video = await getVideo(streamRef);
  const width = video.videoWidth || 1;
  const height = video.videoHeight || 1;

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, MAX_WIDTH / width);
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvasが利用できません");
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) {
          resolve(b);
        } else {
          reject(new Error("画像のBlob化に失敗しました"));
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });

  return blob;
}
