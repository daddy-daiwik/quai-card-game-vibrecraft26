/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                quai: {
                    100: '#e0e7ff',
                    500: '#6366f1',
                    900: '#312e81',
                }
            },
            fontFamily: {
                game: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
