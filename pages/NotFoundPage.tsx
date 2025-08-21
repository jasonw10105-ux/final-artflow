import React from 'react';
import { Link } from 'react-router-dom';
const NotFoundPage = () => (
    <div style={{ textAlign: 'center', padding: '5rem' }}>
        <h1>404: Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <Link to="/">Go back to the homepage</Link>
    </div>
);
export default NotFoundPage;