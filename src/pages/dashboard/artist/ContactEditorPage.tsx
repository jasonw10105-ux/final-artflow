// src/pages/dashboard/artist/ContactEditorPage.tsx

import React from 'react';
import { useParams } from 'react-router-dom';

const ContactEditorPage = () => {
    const { contactId }: { contactId?: string } = useParams();

    const handleSomeAction = (id: string | undefined) => {
        // Now 'id' is explicitly a string or undefined
        console.log("Editing contact with ID:", id);
    };

    handleSomeAction(contactId);

    return (
        <div>
            <h1>Edit Contact {contactId}</h1>
            {/* ... form for editing contact */}
        </div>
    );
};

export default ContactEditorPage;