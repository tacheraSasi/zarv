# API Response Validator (ARV)

ARV is a web-based application designed to streamline the process of validating API responses against Zod schemas. It is particularly useful for backend developers who are working with frontend applications that rely on Zod for API response validation, or for those whose backend does not natively support Zod validation.

## Features

- **Zod Schema Support**: Paste a Zod schema to define the expected structure of the API response
- **API Endpoint Testing**: Specify an API endpoint and make a request directly from the ARV platform
- **Authorization Handling**: Include authorization tokens and custom headers for authenticated API requests
- **Instant Validation Feedback**: Get real-time feedback on whether the API response matches the schema

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/arv.git
   cd arv
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Enter a Zod Schema**: Paste your Zod schema in the schema input field, or select one of the sample schemas provided.

2. **Specify an API Endpoint**: Enter the URL of the API endpoint you want to test, or select one of the sample endpoints.

3. **Add Authorization (if needed)**: If your API requires authentication, select the appropriate authorization type and enter your credentials.

4. **Submit the Request**: Click the "Validate API Response" button to send the request and validate the response.

5. **View Results**: The response will be displayed along with validation results, showing whether it matches the schema and any validation errors.

## Technologies Used

- **Vite**: Fast build tool and development server
- **React**: UI library for building the interface
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Zod**: Schema validation library
- **SES**: Secure ECMAScript for sandboxed schema evaluation
- **Axios**: HTTP client for making API requests

## Benefits

- **Faster Development Cycle**: Test and validate API responses without waiting for frontend feedback
- **Improved Collaboration**: Provide a direct way to test API responses between frontend and backend teams
- **Increased Confidence in API Design**: Ensure APIs conform to the required response structure

## License

This project is licensed under the MIT License - see the LICENSE file for details.
