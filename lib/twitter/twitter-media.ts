export const getTwitterMedia = async (id: string) => {
  try {
    const response = await fetch(
      `https://api.twitter.com/1.1/statuses/show.json?id=${id}&tweet_mode=extended`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TWITTER_AUTH_TOKEN}`,
        },
      },
    );
    const data = await response.json();
    const videoData = data.extended_entities.media[0].video_info;

    // filter for only MP4 videos
    const mp4VideosOnly = videoData?.variants?.filter(
      (variant) => variant.content_type === "video/mp4",
    );

    // get the video with the best bitrate
    const bestVideoBitrate = mp4VideosOnly.reduce(function (prev, current) {
      return prev.bitrate > current.bitrate ? prev : current;
    });

    return bestVideoBitrate;
  } catch (error) {
    console.log(id, error);
  }
};
