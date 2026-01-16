// OpenAI Image Edit API integration
export async function generateDepthMap(imageFile, apiKey) {
  const formData = new FormData();
  formData.append('model', 'gpt-image-1.5');
  formData.append('image', imageFile);
  formData.append('prompt', 'make a simple depth map from this image. Light should mean closer, dark farther. Output should be grayscale only.');
  formData.append('size', 'auto');
  formData.append('quality', 'medium');

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate depth map');
  }

  const data = await response.json();
  
  // The API returns base64 encoded image
  const base64Image = data.data[0].b64_json;
  return `data:image/png;base64,${base64Image}`;
}
