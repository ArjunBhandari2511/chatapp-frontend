
import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ChatApp</h1>
          <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto rounded-full mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h2>
          <p className="text-gray-600">{subtitle}</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
