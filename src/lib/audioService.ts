export const generateAudio = async (
  text: string,
): Promise<string | undefined> => {
  console.log(`AudioService: Generating audio for text: "${text}"`);
  if (text && text.trim()) {
    const testAudioUrl =
      "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";
    console.log(
      `AudioService: USING VALID TEST AUDIO URL for onended testing: ${testAudioUrl}`,
    );
    return testAudioUrl;
  }
  console.log("AudioService: No text provided, skipping audio generation.");
  return undefined;
};
