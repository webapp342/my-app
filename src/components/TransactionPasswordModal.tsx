'use client';

import { useState, useRef, useEffect } from 'react';

interface TransactionPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  loading?: boolean;
  error?: string;
}

export default function TransactionPasswordModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  error = '',
}: TransactionPasswordModalProps) {
  const [password, setPassword] = useState(['', '', '', '', '', '']);
  const [confirmPassword, setConfirmPassword] = useState([
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  const [step, setStep] = useState<'password' | 'confirm'>('password');
  const [localError, setLocalError] = useState('');

  const passwordRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword(['', '', '', '', '', '']);
      setConfirmPassword(['', '', '', '', '', '']);
      setStep('password');
      setLocalError('');
      // Focus first input after a short delay
      setTimeout(() => {
        passwordRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle input change for password
  const handlePasswordChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit

    const newPassword = [...password];
    newPassword[index] = value;
    setPassword(newPassword);
    setLocalError('');

    // Auto-focus next input
    if (value && index < 5) {
      passwordRefs.current[index + 1]?.focus();
    }

    // Check if password is complete
    if (value && index === 5) {
      const fullPassword = newPassword.join('');
      if (fullPassword.length === 6) {
        setStep('confirm');
        setTimeout(() => {
          confirmRefs.current[0]?.focus();
        }, 100);
      }
    }
  };

  // Handle input change for confirm password
  const handleConfirmChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit

    const newConfirmPassword = [...confirmPassword];
    newConfirmPassword[index] = value;
    setConfirmPassword(newConfirmPassword);
    setLocalError('');

    // Auto-focus next input
    if (value && index < 5) {
      confirmRefs.current[index + 1]?.focus();
    }

    // Check if confirm password is complete
    if (value && index === 5) {
      const fullConfirmPassword = newConfirmPassword.join('');
      if (fullConfirmPassword.length === 6) {
        handleSubmit(password.join(''), fullConfirmPassword);
      }
    }
  };

  // Handle backspace
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent,
    isConfirm: boolean
  ) => {
    if (e.key === 'Backspace') {
      const currentArray = isConfirm ? confirmPassword : password;
      const setArray = isConfirm ? setConfirmPassword : setPassword;
      const refs = isConfirm ? confirmRefs : passwordRefs;

      if (currentArray[index] === '' && index > 0) {
        // Move to previous input if current is empty
        refs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newArray = [...currentArray];
        newArray[index] = '';
        setArray(newArray);
      }
    }
  };

  // Handle form submission
  const handleSubmit = (pass: string, confirmPass: string) => {
    if (pass.length !== 6) {
      setLocalError('Transaction password must be 6 digits');
      return;
    }

    if (pass !== confirmPass) {
      setLocalError('Passwords do not match');
      setStep('password');
      setPassword(['', '', '', '', '', '']);
      setConfirmPassword(['', '', '', '', '', '']);
      setTimeout(() => {
        passwordRefs.current[0]?.focus();
      }, 100);
      return;
    }

    onConfirm(pass);
  };

  // Handle manual submit button click
  const handleManualSubmit = () => {
    const pass = password.join('');
    const confirmPass = confirmPassword.join('');
    handleSubmit(pass, confirmPass);
  };

  // Reset to password step
  const resetToPassword = () => {
    setStep('password');
    setPassword(['', '', '', '', '', '']);
    setConfirmPassword(['', '', '', '', '', '']);
    setLocalError('');
    setTimeout(() => {
      passwordRefs.current[0]?.focus();
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative'>
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50'
        >
          <svg
            className='w-6 h-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>

        {/* Header */}
        <div className='text-center mb-8'>
          <div className='w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg
              className='w-8 h-8 text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
              />
            </svg>
          </div>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Transaction Password
          </h2>
          <p className='text-gray-600'>
            {step === 'password'
              ? 'Enter your 6-digit transaction password'
              : 'Confirm your transaction password'}
          </p>
        </div>

        {/* Password Input */}
        <div className='mb-6'>
          <div className='flex justify-center space-x-3 mb-4'>
            {(step === 'password' ? password : confirmPassword).map(
              (digit, index) => (
                <input
                  key={index}
                  ref={el => {
                    if (step === 'password') {
                      passwordRefs.current[index] = el;
                    } else {
                      confirmRefs.current[index] = el;
                    }
                  }}
                  type='password'
                  maxLength={1}
                  value={digit}
                  onChange={e => {
                    if (step === 'password') {
                      handlePasswordChange(index, e.target.value);
                    } else {
                      handleConfirmChange(index, e.target.value);
                    }
                  }}
                  onKeyDown={e => handleKeyDown(index, e, step === 'confirm')}
                  disabled={loading}
                  className='w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'
                />
              )
            )}
          </div>

          {/* Progress indicator */}
          <div className='flex justify-center space-x-2 mb-4'>
            <div
              className={`w-3 h-3 rounded-full ${step === 'password' ? 'bg-purple-600' : 'bg-green-500'}`}
            ></div>
            <div
              className={`w-3 h-3 rounded-full ${step === 'confirm' ? 'bg-purple-600' : 'bg-gray-300'}`}
            ></div>
          </div>

          {/* Step indicator */}
          <div className='text-center text-sm text-gray-500 mb-4'>
            Step {step === 'password' ? '1' : '2'} of 2
          </div>
        </div>

        {/* Error message */}
        {(localError || error) && (
          <div className='bg-red-50 border border-red-200 rounded-lg p-3 mb-6'>
            <div className='flex items-center'>
              <svg
                className='w-5 h-5 text-red-500 mr-2'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                  clipRule='evenodd'
                />
              </svg>
              <span className='text-red-700 text-sm'>
                {localError || error}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className='space-y-3'>
          {step === 'confirm' && (
            <button
              onClick={resetToPassword}
              disabled={loading}
              className='w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              ← Back to Password
            </button>
          )}

          <button
            onClick={handleManualSubmit}
            disabled={
              loading ||
              (step === 'password'
                ? password.join('').length !== 6
                : confirmPassword.join('').length !== 6)
            }
            className='w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed'
          >
            {loading ? (
              <div className='flex items-center justify-center'>
                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                Processing...
              </div>
            ) : step === 'password' ? (
              'Continue'
            ) : (
              'Complete Purchase'
            )}
          </button>

          <button
            onClick={onClose}
            disabled={loading}
            className='w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Cancel
          </button>
        </div>

        {/* Security note */}
        <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
          <div className='flex items-start'>
            <svg
              className='w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                clipRule='evenodd'
              />
            </svg>
            <div className='text-blue-800 text-xs'>
              <p className='font-medium mb-1'>Security Notice</p>
              <p>
                This is the same 6-digit password you set when creating your
                wallet. It&apos;s used to authorize transactions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
