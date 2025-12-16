import axios from 'axios';

const API_BASE_URL = 'https://api.openai.com/v1';

const openaiService = {
  async generateImage(prompt, apiKey) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/images/generations`,
        {
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.data[0].url;
    } catch (error) {
      console.error('Error generating image:', error);
      return null;
    }
  },

  async generateImagesForBlog(content, topic, apiKey, pageCount) {
    try {
      // Extract main sections from the blog content (sections with ## headings)
      const sectionMatches = content.matchAll(/##\s+([^\n]+)/g);
      const sections = Array.from(sectionMatches).map(match => match[1]);
      const images = [];
      
      // Generate images for key sections (1-2 images per page, max 10 images)
      const maxImages = Math.min(Math.max(pageCount, 2), 10);
      const sectionsToImage = sections.slice(0, maxImages);
      
      for (let i = 0; i < sectionsToImage.length; i++) {
        const sectionHeading = sectionsToImage[i];
        // Create image prompt based on section heading and topic
        const imagePrompt = `Professional, high-quality illustration related to "${sectionHeading}" in the context of "${topic}". Modern, clean, and visually appealing style suitable for a blog article. No text in the image.`;
        
        try {
          const imageUrl = await this.generateImage(imagePrompt, apiKey);
          if (imageUrl) {
            images.push({
              sectionIndex: i,
              url: imageUrl,
              description: sectionHeading.substring(0, 100)
            });
          }
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Error generating image for section ${i}:`, error);
          // Continue with other sections even if one fails
        }
      }
      
      return images;
    } catch (error) {
      console.error('Error generating images:', error);
      return [];
    }
  },
  async generateBlog(topic, pageCount) {
    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('OpenAI API key is not configured. Please add REACT_APP_OPENAI_API_KEY to your .env file.');
      }

      // Estimate words per page (approximately 500 words per page for standard formatting)
      const wordsPerPage = 500;
      const targetWords = pageCount * wordsPerPage;
      
      // Calculate max_tokens: approximately 0.75 tokens per word, with buffer
      // For longer content, we'll use a model that supports higher token limits
      const estimatedTokens = Math.ceil(targetWords * 0.75);
      // Try to use a model with higher token limits for longer content
      // gpt-4o supports up to 16384 output tokens, gpt-4-turbo supports 4096, gpt-4 supports 4096
      let model = 'gpt-4';
      let maxOutputTokens = 4096;
      
      // For longer content, try to use models with higher limits
      if (pageCount > 5) {
        // Try gpt-4o first (if available), otherwise fallback to gpt-4
        model = 'gpt-4o';
        maxOutputTokens = 16384;
      }
      
      const maxTokens = Math.min(estimatedTokens + 500, maxOutputTokens);

      const prompt = `Write a detailed, comprehensive blog post about "${topic}". 

CRITICAL REQUIREMENTS:
- The blog MUST be EXACTLY ${targetWords} words long (${pageCount} full pages of content)
- This is approximately ${pageCount} pages when formatted in a standard document
- Do NOT write less than ${targetWords} words
- Ensure the content is substantial and fills ${pageCount} complete pages

Structure the blog with:
- An engaging introduction with ## Introduction heading (10-15% of content)
- Multiple detailed sections with clear headings using ## for main sections (like ## What is..., ## Benefits of..., ## How to..., etc.)
- Use ### for subtitles/subheadings within sections
- Each section should be comprehensive with examples, insights, and detailed explanations
- A compelling conclusion with ## Conclusion heading (10-15% of content)
- Use markdown formatting ONLY for headings: ## for main section headings (Introduction, Conclusion, and all major sections), ### for subtitles/subheadings
- IMPORTANT: Body paragraphs and regular text must be plain text with NO bold markdown (**text**). Do NOT use **bold** or *italic* in body paragraphs. Only headings should use markdown formatting (## and ###). All body content should be in normal, regular font weight. All headings will automatically be bold in the output.

Topic: ${topic}
Required length: EXACTLY ${targetWords} words (${pageCount} pages)
Word count target: ${targetWords} words minimum`;

      // For very long content (10+ pages), we might need to generate in chunks
      if (pageCount >= 10) {
        return await this.generateLongBlog(topic, pageCount, targetWords, apiKey, model);
      }

      const response = await axios.post(
        `${API_BASE_URL}/chat/completions`,
        {
          model: model,
          messages: [
            {
              role: 'system',
              content: `You are a professional blog writer who creates detailed, well-structured, and engaging blog posts. You are meticulous about meeting exact word count requirements. When asked for ${targetWords} words, you MUST deliver exactly that amount of content. IMPORTANT: Use markdown formatting ONLY for headings (## or ###). Body paragraphs must be plain text without any bold (**text**) or italic (*text*) markdown formatting. Only headings should have markdown formatting.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      let content = response.data.choices[0].message.content;
      
      // Verify word count and extend if needed
      const wordCount = content.split(/\s+/).length;
      if (wordCount < targetWords * 0.9) {
        // If content is significantly shorter, request additional content
        const additionalWords = targetWords - wordCount;
        const extendPrompt = `The previous blog post about "${topic}" was ${wordCount} words, but I need it to be ${targetWords} words (${pageCount} pages). Please add ${additionalWords} more words of detailed, relevant content. Continue from where it left off, maintaining the same style and quality.`;
        
        const extendResponse = await axios.post(
          `${API_BASE_URL}/chat/completions`,
          {
            model: model,
            messages: [
              {
                role: 'system',
                content: 'You are a professional blog writer who extends existing content while maintaining quality and style.'
              },
              {
                role: 'user',
                content: `Here is the current blog:\n\n${content}\n\n${extendPrompt}`
              }
            ],
            max_tokens: Math.min(Math.ceil(additionalWords * 0.75) + 200, 4096),
            temperature: 0.7,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        content = content + '\n\n' + extendResponse.data.choices[0].message.content;
      }

      // Generate images for the blog
      const images = await this.generateImagesForBlog(content, topic, apiKey, pageCount);
      
      // Return content with image metadata
      return {
        content: content,
        images: images
      };
    } catch (error) {
      console.error('Error generating blog:', error);
      if (error.response) {
        throw new Error(`OpenAI API Error: ${error.response.data.error?.message || error.message}`);
      } else if (error.request) {
        throw new Error('No response from OpenAI API. Please check your internet connection.');
      } else {
        throw new Error(`Error: ${error.message}`);
      }
    }
  },

  async generateLongBlog(topic, pageCount, targetWords, apiKey, model) {
    // For very long blogs (10+ pages), generate in sections
    const sectionsPerPage = 2; // 2 main sections per page
    const totalSections = pageCount * sectionsPerPage;
    const wordsPerSection = Math.ceil(targetWords / totalSections);
    
    let fullContent = '';
    const introductionPrompt = `Write an engaging introduction for a blog post about "${topic}". This introduction should be approximately ${Math.ceil(wordsPerSection * 1.5)} words and set up the topic for a comprehensive ${pageCount}-page blog post.`;
    
    // Generate introduction
    const introResponse = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional blog writer who creates engaging introductions.'
          },
          {
            role: 'user',
            content: introductionPrompt
          }
        ],
        max_tokens: Math.min(Math.ceil(wordsPerSection * 1.5 * 0.75) + 200, 4096),
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    fullContent = introResponse.data.choices[0].message.content + '\n\n';
    
    // Generate main sections
    for (let i = 1; i <= totalSections; i++) {
      const sectionPrompt = `Write section ${i} of ${totalSections} for a comprehensive blog post about "${topic}". 
      
This section should be approximately ${wordsPerSection} words and cover a specific aspect of the topic. 
Make it detailed and informative. Use markdown formatting ONLY for the section heading (## for the heading).
IMPORTANT: Body paragraphs must be plain text with NO bold markdown (**text**). Only the heading should use markdown. All body content should be in normal, regular font weight.

Topic: ${topic}
Section ${i} of ${totalSections}
Target: ${wordsPerSection} words`;

      try {
        const sectionResponse = await axios.post(
          `${API_BASE_URL}/chat/completions`,
          {
            model: model,
            messages: [
              {
                role: 'system',
                content: 'You are a professional blog writer creating detailed sections for a comprehensive blog post. Use markdown formatting ONLY for headings (##). Body paragraphs must be plain text without bold (**text**) or italic (*text*) markdown formatting.'
              },
              {
                role: 'user',
                content: sectionPrompt
              }
            ],
            max_tokens: Math.min(Math.ceil(wordsPerSection * 0.75) + 200, 4096),
            temperature: 0.7,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        fullContent += sectionResponse.data.choices[0].message.content + '\n\n';
      } catch (error) {
        console.error(`Error generating section ${i}:`, error);
        // Continue with other sections even if one fails
      }
    }
    
    // Generate conclusion
    const conclusionPrompt = `Write a compelling conclusion for a blog post about "${topic}". This conclusion should be approximately ${Math.ceil(wordsPerSection * 1.5)} words and summarize the key points from the ${pageCount}-page blog post.`;
    
    const conclusionResponse = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional blog writer who creates compelling conclusions.'
          },
          {
            role: 'user',
            content: conclusionPrompt
          }
        ],
        max_tokens: Math.min(Math.ceil(wordsPerSection * 1.5 * 0.75) + 200, 4096),
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    fullContent += conclusionResponse.data.choices[0].message.content;
    
    // Generate images for the long blog
    const images = await this.generateImagesForBlog(fullContent, topic, apiKey, pageCount);
    
    return {
      content: fullContent,
      images: images
    };
  },
};

export default openaiService;

