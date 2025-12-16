import React, { useState } from 'react';
import './BlogGenerator.css';
import openaiService from '../services/openaiService';
import { downloadAsWord, downloadAsPDF } from '../utils/downloadUtils';

const BlogGenerator = () => {
  const [topic, setTopic] = useState('');
  const [pageCount, setPageCount] = useState(1);
  const [blogContent, setBlogContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (pageCount < 1 || pageCount > 25) {
      setError('Page count must be between 1 and 25');
      return;
    }

    setLoading(true);
    setError('');
    setBlogContent('');

    try {
      const content = await openaiService.generateBlog(topic.trim(), pageCount);
      setBlogContent(content);
    } catch (err) {
      setError(err.message || 'Failed to generate blog. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!blogContent) return;
    try {
      await downloadAsWord(blogContent, topic);
    } catch (err) {
      setError('Failed to download Word document: ' + err.message);
    }
  };

  const handleDownloadPDF = async () => {
    if (!blogContent) return;
    try {
      await downloadAsPDF(blogContent, topic);
    } catch (err) {
      setError('Failed to download PDF document: ' + err.message);
    }
  };

  return (
    <div className="blog-generator">
      <div className="container">
        <h1 className="title">AI Blog Generator</h1>
        <p className="subtitle">Generate detailed blogs on any topic with AI</p>

        <div className="input-section">
          <div className="input-group">
            <label htmlFor="topic">Blog Topic</label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your blog topic..."
              disabled={loading}
              className="topic-input"
            />
          </div>

          <div className="input-group">
            <label htmlFor="pages">Number of Pages</label>
            <input
              id="pages"
              type="number"
              value={pageCount}
              onChange={(e) => setPageCount(parseInt(e.target.value) || 1)}
              min="1"
              max="25"
              disabled={loading}
              className="page-input"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="generate-btn"
          >
            {loading ? 'Generating...' : 'Generate Blog'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {blogContent && (
          <div className="blog-section">
            <div className="blog-header">
              <div>
                <h2 className="blog-title">{topic}</h2>
                <p className="word-count">
                  Word Count: {blogContent.split(/\s+/).length.toLocaleString()} words 
                  ({Math.round(blogContent.split(/\s+/).length / 500)} pages)
                </p>
              </div>
              <div className="download-buttons">
                <button onClick={handleDownloadWord} className="download-btn word-btn">
                  Download as Word
                </button>
                <button onClick={handleDownloadPDF} className="download-btn pdf-btn">
                  Download as PDF
                </button>
              </div>
            </div>
            <div className="blog-content">
              <pre className="blog-text">{blogContent}</pre>
            </div>
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Generating your blog... This may take a moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogGenerator;

