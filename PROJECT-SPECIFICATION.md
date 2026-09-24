\# Asset Manager — Project Specification



\## 1. Project Overview



Asset Manager is a full-stack career and interview preparation platform designed to provide users with tools for resume creation, resume analysis, interview practice, and programming challenges.



The application combines a React/TypeScript frontend with a Node.js/TypeScript backend, PostgreSQL database, Clerk authentication, Google Gemini integrations, and Judge0-compatible code execution.



The project is being offered as a software source-code project for transfer to a new owner.



\---



\## 2. Core Features



\### Dashboard



The dashboard provides the main entry point into the application and gives users access to the major career-preparation modules.



\### Resume Builder



Users can create and edit resumes containing:



\- Personal information

\- Professional summary

\- Work experience

\- Education

\- Skills

\- Projects



The builder provides a live resume preview.



The application also supports PDF resume export.



\### Resume / ATS Checker



Users can upload resumes for analysis.



Supported formats include:



\- PDF

\- DOCX

\- TXT



The system generates an ATS-style score and provides suggestions based on the uploaded resume content.



\### AI Resume Analysis



Resume information can be analyzed to provide structured feedback and improvement suggestions.



\### AI Mock Interviews



The interview module supports:



\- Role-based interview preparation

\- Difficulty selection

\- Resume-aware interview evaluation

\- Structured interview sessions

\- Voice interaction

\- Answer evaluation

\- Interview scoring

\- Feedback



Supported interview categories include areas such as:



\- Java

\- Python

\- MERN

\- Full Stack

\- Data Analyst

\- Data Science

\- AI / ML

\- HR



\### Voice Interview Interaction



The interview room uses browser speech capabilities for voice-based interaction.



The system can:



\- Present interview questions

\- Accept spoken responses

\- Convert speech to text

\- Provide spoken AI responses

\- Track the interview session



\### Coding Arena



The Coding Arena provides programming problems with online code execution and automated judging.



Supported languages:



\- JavaScript

\- TypeScript

\- Python

\- Java



The application integrates with a Judge0-compatible execution service.



The current question bank includes problems covering common programming and algorithm topics such as:



\- Two Sum

\- Valid Parentheses

\- Binary Search

\- Best Time to Buy and Sell Stock

\- Maximum Subarray

\- Merge Intervals

\- Longest Substring Without Repeating Characters

\- Number of Islands

\- Product of Array Except Self

\- Trapping Rain Water



\---



\## 3. Technology Stack



\### Frontend



\- React

\- TypeScript

\- Vite

\- Tailwind CSS

\- shadcn/ui

\- React Query

\- Lucide icons



\### Backend



\- Node.js

\- TypeScript

\- Express

\- Drizzle ORM



\### Database



\- PostgreSQL



\### Authentication



\- Clerk



\### AI



\- Google Gemini



\### Code Execution



\- Judge0-compatible execution service



\### PDF Generation



\- jsPDF



\---



\## 4. Architecture



The application follows a full-stack architecture:



```text

Browser

&#x20;  |

&#x20;  v

React / Vite Frontend

&#x20;  |

&#x20;  | HTTP API

&#x20;  v

Node.js / Express API

&#x20;  |

&#x20;  +---------> Clerk Authentication

&#x20;  |

&#x20;  +---------> Google Gemini

&#x20;  |

&#x20;  +---------> Judge0-compatible Service

&#x20;  |

&#x20;  v

Drizzle ORM

&#x20;  |

&#x20;  v

PostgreSQL

