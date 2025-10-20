'use client';

import React, { useState } from 'react';
import { firebaseAuthService } from "@/api/firebase/firebaseAuthService";
import { redirect } from 'next/navigation';

// LoginPage component for user authentication
export default function Login() {
    // State for login fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // State for handling loading and error messages
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Function to handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission behavior
        setIsLoading(true);
        setError(''); // Clear previous errors

        //Redirect cannot be called in a try/catch as
        //it throws an error to redirect
        let shouldRedirect = false;

        try {
            const response = await firebaseAuthService.login.loginWithEmail({
                email: email,
                password: password,
            });

            if (response.ok) {
                console.log('Login successful, session cookie set.');

                //Set it here to be read outside try/catch
                shouldRedirect = true;
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'An unknown error occurred.');
            }
        } catch (e) {
            // Catches errors thrown from the auth service (e.g., invalid credentials)
            console.error("Login page error:", e);
            setError((e as Error).message || 'Failed to log in. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }

        //If login was ok then redirect to dashboard
        if (shouldRedirect) {
            redirect('/dashboard');
        }
    };

    // Helper function to render a form input field
    const renderInputField = (
        id: string, 
        label: string, 
        type: React.HTMLInputTypeAttribute, 
        value: string, 
        onChange: (value: string) => void, 
        placeholder = ''
    ) => (
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
        // Main container for the login page
        <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground rounded-lg">
            {/* Form container with max-width and responsive padding */}
            <div className="w-full max-w-md bg-card p-6 md:p-8 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-center mb-6 text-foreground">Login to Your Account</h2>
                
                <form onSubmit={
                        (e) => {
                            void (async () => {
                                await handleSubmit(e);
                            })();
                        }
                    }>
                    {renderInputField('email', 'Email', 'email', email, setEmail, 'your.email@example.com')}
                    {renderInputField('password', 'Password', 'password', password, setPassword, 'Enter your password')}

                    {error && (
                        <p className="text-destructive text-sm text-center italic mb-4">{error}</p>
                    )}

                    {/* Form Submission Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-6 w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-3 px-6 rounded-lg
                                   shadow-lg transition-colors duration-300 focus:outline-none focus:ring-2
                                   focus:ring-primary focus:ring-opacity-75 disabled:opacity-50"
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {/* Link to Sign Up Page */}
                <div className="text-center mt-6">
                    <a href="/signup" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        Don`&apos`;t have an account? <span className="font-semibold text-primary">Sign Up</span>
                    </a>
                </div>
            </div>
        </div>
    );
}