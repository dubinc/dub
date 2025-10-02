export const generateVideoPreview = (
  videoSrc: string,
  setPreviewUrl: (url: string | null) => void,
  cleanup?: () => void,
  isLocalFile: boolean = false,
) => {
  const video = document.createElement("video");
  video.src = videoSrc;

  if (!isLocalFile) {
    video.crossOrigin = "anonymous";
  }

  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  const canvas = document.createElement("canvas");
  let isExtracted = false;

  const extractFrame = () => {
    if (isExtracted) return;

    try {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      if (video.readyState < 2) {
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        ctx.drawImage(video, 0, 0);

        const imageData = ctx.getImageData(0, 0, 50, 50);
        const hasContent = imageData.data.some((pixel) => pixel !== 0);

        if (!hasContent) {
          return;
        }
      } catch (drawError) {
        return;
      }

      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

        if (dataUrl && dataUrl !== "data:," && dataUrl.length > 100) {
          isExtracted = true;
          setPreviewUrl(dataUrl);
        } else {
          setPreviewUrl(null);
        }
      } catch (dataUrlError) {
        try {
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size > 0) {
                isExtracted = true;
                const imageUrl = URL.createObjectURL(blob);
                setPreviewUrl(imageUrl);
              } else {
                setPreviewUrl(null);
              }
            },
            "image/jpeg",
            0.8,
          );
        } catch (blobError) {
          setPreviewUrl(null);
        }
      }
    } catch (error) {
      setPreviewUrl(null);
    }
  };

  video.addEventListener("loadedmetadata", () => {
    if (video.duration > 0) {
      try {
        video.currentTime = Math.min(1, video.duration * 0.1);
      } catch (e) {
        // ignore
      }
    }
  });

  video.addEventListener("seeked", () => {
    if (!isExtracted) {
      setTimeout(extractFrame, 100);
    }
  });

  video.addEventListener("loadeddata", () => {
    if (!isExtracted) {
      extractFrame();
    }
  });

  video.addEventListener("canplay", () => {
    if (!isExtracted) {
      setTimeout(extractFrame, 200);
    }
  });

  video.addEventListener("error", () => {
    setPreviewUrl(null);
  });

  video.load();

  return cleanup;
};
