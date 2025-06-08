'use client'

import React, { useState } from 'react';

/**
 * @todo Not sure if its smart to put the types in a seperate file
 */
import { SignupType } from '@/AuthApi/SignUp/signUp';

// SignUpPage component for user registration
// It receives setCurrentPage from the parent App component for navigation.
export default function SignUpPage() {

    // State to manage the user's choice: 'individual' or 'organization'
    const [signupType, setSignupType] = useState<SignupType | null>(null); // null, 'individual', or 'organization'

    // State for organization-related fields
    const [organizationNumber, setOrganizationNumber] = useState('');
    const [employeeId, setEmployeeId] = useState('');

    // State for user registration fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Function to handle form submission
    const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior

    // Basic password validation
    if (password !== confirmPassword) {
        setPasswordError('Passwords do not match.');
        return;
    }
    setPasswordError(''); // Clear error if passwords match

     /**
     * 
     * @todo Switch for real api
     */

    // For now, just log the form data.
    // In a real application, you would send this data to an API for user registration.
    console.log('Sign Up Data:', {
        signupType,
        ...(signupType === 'organization' && { organizationNumber, employeeId }), // Conditionally add org data
        name,
        email,
        password,
    });

    // Here you would typically call an authentication API.
    // For demonstration, let's simulate a successful signup and navigate back to home
    // or to a dashboard.
    // Using a custom alert/message box instead of window.alert()
    const showMessage = (msg: string) => {
        const messageBox = document.createElement('div');
        messageBox.className = "fixed inset-0 flex items-center justify-center z-50 p-4";
        messageBox.innerHTML = `
        <div class="bg-card text-foreground p-6 rounded-lg shadow-xl max-w-sm text-center">
            <p class="text-lg font-semibold mb-4">${msg}</p>
            <button class="bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-2 px-4 rounded-md" onclick="this.parentNode.parentNode.remove()">
            OK
            </button>
        </div>
        `;
        document.body.appendChild(messageBox);
    };

    showMessage('Sign Up Successful! (Check console for data)');
    };

    // Helper function to render a form input field
    const renderInputField = (
        id: string, 
        label: string, 
        type: React.HTMLInputTypeAttribute | undefined, 
        value: string, 
        onChange: (value: string) => void, 
        placeholder = '') => (
    <div className="mb-4">
        <label htmlFor={id} className="block text-foreground text-sm font-bold mb-2">
        {label}
        </label>
        <input
        type={type}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="shadow appearance-none border border-border rounded-lg w-full py-3 px-4
                    text-foreground leading-tight focus:outline-none focus:ring-2 focus:ring-primary
                    focus:border-transparent bg-input"
        />
    </div>
    );

    return (
    // Main container for the sign-up page. Similar styling to the homepage.
    // min-h-screen centers content, bg-background and text-foreground for dark theme.
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground rounded-lg">
        {/* Form container with max-width and responsive padding */}
        <div className="w-full max-w-md bg-card p-6 md:p-8 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-6 text-foreground">Sign Up for GoFlow</h2>

        {/* Step 1: Choose Sign-up Type */}
        {signupType === null && (
            <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">How would you like to sign up?</h3>
            <div className="flex flex-col space-y-3">
                <label className="inline-flex items-center text-foreground">
                <input
                    type="radio"
                    name="signupType"
                    value="individual"
                    onChange={() => setSignupType(SignupType.INDIVIDUAL)}
                    className="form-radio h-5 w-5 text-primary"
                />
                <span className="ml-2">Sign up by myself</span>
                </label>
                <label className="inline-flex items-center text-foreground">
                <input
                    type="radio"
                    name="signupType"
                    value="organization"
                    onChange={() => setSignupType(SignupType.ORGANIZATION)}
                    className="form-radio h-5 w-5 text-primary"
                />
                <span className="ml-2">Sign up with an existing organization</span>
                </label>
            </div>
            {/* Back button (optional, but good for UX) */}
            <button
                className="mt-6 w-full bg-secondary hover:bg-secondary-hover text-secondary-foreground font-bold py-2 px-4 rounded-lg
                            transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-secondary
                            focus:ring-opacity-75"
            >
                Back to Home
            </button>
            </div>
        )}

        {/* Step 2: Organization Details (if selected) or Registration Form */}
        {signupType !== null && (
            <form onSubmit={handleSubmit}>
            {signupType === 'organization' && (
                <div className="mb-6 bg-background-surface p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">Organization Details</h3>
                {renderInputField('organizationNumber', 'Organization Number', 'text', organizationNumber, setOrganizationNumber, 'e.g., ORG12345')}
                {renderInputField('employeeId', 'Employee ID', 'text', employeeId, setEmployeeId, 'e.g., EMP001')}
                </div>
            )}

            <h3 className="text-lg font-semibold text-foreground mb-4">Your Account Details</h3>
            {renderInputField('name', 'Name', 'text', name, setName, 'John Doe')}
            {renderInputField('email', 'Email', 'email', email, setEmail, 'john.doe@example.com')}
            {renderInputField('password', 'Password', 'password', password, setPassword, 'Min. 8 characters')}
            {renderInputField('confirmPassword', 'Confirm Password', 'password', confirmPassword, setConfirmPassword, 'Repeat your password')}

            {passwordError && (
                <p className="text-destructive text-sm italic mb-4">{passwordError}</p>
            )}

            {/* Form Submission Button */}
            <button
                type="submit"
                className="mt-6 w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-3 px-6 rounded-lg
                            shadow-lg transition-colors duration-300 focus:outline-none focus:ring-2
                            focus:ring-primary focus:ring-opacity-75"
            >
                Sign Up
            </button>
            {/* Back button for the form */}
            <button
                onClick={() => setSignupType(null)} // Go back to type selection
                className="mt-4 w-full bg-muted hover:bg-muted-foreground text-foreground font-bold py-2 px-4 rounded-lg
                            transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-muted
                            focus:ring-opacity-75"
            >
                Back
            </button>
            </form>
        )}
        </div>
    </div>
    );
}
