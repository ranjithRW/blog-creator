# AI Blog Generator

A React application that generates detailed blogs on any topic using OpenAI's API. Users can specify the topic and page count, then download the generated blog in both Word (.docx) and PDF formats.

## Features

- 🤖 AI-powered blog generation using OpenAI GPT-4
- 📝 Customizable page count (1-10 pages)
- 📄 Download as Word document (.docx)
- 📑 Download as PDF document
- 🎨 Modern, responsive UI
- ⚡ Fast and efficient

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
```

Replace `your_openai_api_key_here` with your actual OpenAI API key.

### 3. Run the Application

```bash
npm start
```

The application will open at `http://localhost:3000`

## Usage

1. Enter a blog topic in the input field
2. Specify the number of pages (1-10)
3. Click "Generate Blog" to create your blog
4. Once generated, you can:
   - Read the blog in the preview area
   - Download as Word document (.docx)
   - Download as PDF document

## Technologies Used

- **React** - UI framework
- **OpenAI API** - AI blog generation
- **docx** - Word document generation
- **jsPDF** - PDF document generation
- **axios** - HTTP requests
- **file-saver** - File download functionality

## Project Structure

```
src/
  ├── components/
  │   ├── BlogGenerator.js      # Main component
  │   └── BlogGenerator.css     # Component styles
  ├── services/
  │   └── openaiService.js      # OpenAI API integration
  ├── utils/
  │   └── downloadUtils.js      # Word and PDF download utilities
  ├── App.js                     # Main app component
  ├── App.css                    # App styles
  ├── index.js                   # Entry point
  └── index.css                  # Global styles
```

## Notes

- Make sure you have a valid OpenAI API key
- The API key should be stored in the `.env` file (never commit this file)
- The application uses GPT-4 model for blog generation
- Generated blogs are approximately 500 words per page

## License

MIT

