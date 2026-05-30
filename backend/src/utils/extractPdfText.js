const pdfParse = require('pdf-parse');
const axios = require('axios');

// fetch PDF from a URL and extract text
const extractTextFromUrl = async (url) => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const data = await pdfParse(buffer);
    return data.text;
  } catch (err) {
    console.log('PDF text extraction failed:', err.message);
    return '';
  }
};

// extract text directly from a buffer (used during upload)
const extractTextFromBuffer = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (err) {
    console.log('PDF text extraction from buffer failed:', err.message);
    return '';
  }
};

module.exports = { extractTextFromUrl, extractTextFromBuffer };