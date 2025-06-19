'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Step = 'username' | 'password' | 'confirm' | 'review' | 'creating';

export default function CreateWallet() {
  const [currentStep, setCurrentStep] = useState<Step>('username');
  const [formData, setFormData] = useState({
    username: '',
    password: ['', '', '', '', '', ''],
    confirmPassword: ['', '', '', '', '', ''],
  });

  const network = 'BSC_MAINNET';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Refs for OTP inputs
  const passwordRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus management
  useEffect(() => {
    if (currentStep === 'password') {
      setTimeout(() => passwordRefs.current[0]?.focus(), 100);
    } else if (currentStep === 'confirm') {
      setTimeout(() => confirmRefs.current[0]?.focus(), 100);
    }
  }, [currentStep]);

  // Handle username step
  const handleUsernameNext = () => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    setError('');
    setCurrentStep('password');
  };

  // Handle password input
  const handlePasswordChange = (index: number, value: string) => {
    // Only allow single digits
    if (value.length > 1) return;

    // Only allow numeric characters
    if (value && !/^\d$/.test(value)) return;

    const newPassword = [...formData.password];
    newPassword[index] = value.trim(); // Remove any whitespace
    setFormData({ ...formData, password: newPassword });
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      passwordRefs.current[index + 1]?.focus();
    }

    // Check if password is complete
    if (value && index === 5) {
      const fullPassword = newPassword.join('');
      if (fullPassword.length === 6) {
        setTimeout(() => setCurrentStep('confirm'), 500);
      }
    }
  };

  // Handle confirm password input
  const handleConfirmChange = (index: number, value: string) => {
    // Only allow single digits
    if (value.length > 1) return;

    // Only allow numeric characters
    if (value && !/^\d$/.test(value)) return;

    const newConfirmPassword = [...formData.confirmPassword];
    newConfirmPassword[index] = value.trim(); // Remove any whitespace
    setFormData({ ...formData, confirmPassword: newConfirmPassword });
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      confirmRefs.current[index + 1]?.focus();
    }

    // Note: Removed auto-confirm to prevent issues
    // User must click "Confirm Password" button manually
  };

  // Handle backspace
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent,
    isConfirm: boolean
  ) => {
    if (e.key === 'Backspace') {
      const currentArray = isConfirm
        ? formData.confirmPassword
        : formData.password;
      const setArray = isConfirm
        ? (arr: string[]) => setFormData({ ...formData, confirmPassword: arr })
        : (arr: string[]) => setFormData({ ...formData, password: arr });
      const refs = isConfirm ? confirmRefs : passwordRefs;

      if (currentArray[index] === '' && index > 0) {
        refs.current[index - 1]?.focus();
      } else {
        const newArray = [...currentArray];
        newArray[index] = '';
        setArray(newArray);
      }
    }
  };

  // Handle password confirmation
  const handlePasswordConfirm = () => {
    const password = formData.password.join('');
    const confirmPassword = formData.confirmPassword.join('');

    // Debug logging
    console.log('Password debug:', {
      password: password,
      confirmPassword: confirmPassword,
      passwordArray: formData.password,
      confirmArray: formData.confirmPassword,
      passwordLength: password.length,
      confirmLength: confirmPassword.length,
      areEqual: password === confirmPassword,
    });

    if (password.length !== 6) {
      setError('Transaction password must be 6 digits');
      return;
    }

    if (password !== confirmPassword) {
      setError(
        `Passwords do not match. Password: "${password}", Confirm: "${confirmPassword}"`
      );
      setCurrentStep('password');
      setFormData({
        ...formData,
        password: ['', '', '', '', '', ''],
        confirmPassword: ['', '', '', '', '', ''],
      });
      setTimeout(() => passwordRefs.current[0]?.focus(), 100);
      return;
    }

    setError('');
    setCurrentStep('review');
  };

  // Handle wallet creation
  const handleCreateWallet = async () => {
    setCurrentStep('creating');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/create-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password.join(''),
          network: network,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create wallet');
      }

      // Redirect to welcome page with wallet details
      const params = new URLSearchParams({
        address: data.address,
        privateKey: data.privateKey,
        secondPrivateKey: data.secondPrivateKey,
        username: data.username,
        network: data.network,
        balance: data.balance,
        symbol: data.symbol,
        usdtValue: data.usdtValue,
        tokenPrice: data.tokenPrice,
      });

      // Add virtual card data if available
      if (data.virtualCard) {
        params.set(
          'virtualCard',
          encodeURIComponent(JSON.stringify(data.virtualCard))
        );
      }

      router.push(`/welcome?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCurrentStep('review');
    } finally {
      setLoading(false);
    }
  };

  // Back button handler
  const handleBack = () => {
    setError('');
    switch (currentStep) {
      case 'password':
        setCurrentStep('username');
        break;
      case 'confirm':
        setCurrentStep('password');
        setFormData({ ...formData, confirmPassword: ['', '', '', '', '', ''] });
        break;
      case 'review':
        setCurrentStep('confirm');
        break;
    }
  };

  // Step progress
  const getStepNumber = () => {
    switch (currentStep) {
      case 'username':
        return 1;
      case 'password':
        return 2;
      case 'confirm':
        return 3;
      case 'review':
        return 4;
      case 'creating':
        return 5;
      default:
        return 1;
    }
  };

  const stepTitles = {
    username: 'Choose Username',
    password: 'Set Transaction Password',
    confirm: 'Confirm Password',
    review: 'Review & Create',
    creating: 'Creating Wallet',
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'>
      <div className='max-w-lg mx-auto p-6'>
        {/* Header */}
        <div className='text-center mb-8 pt-8'>
          <div className='w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg
              className='w-10 h-10 text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
              />
            </svg>
          </div>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>
            Create New Wallet
          </h1>
          <p className='text-gray-600'>
            BSC Mainnet wallet with real blockchain integration
          </p>
        </div>

        {/* Progress Steps */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-4'>
            {[1, 2, 3, 4, 5].map(step => (
              <div key={step} className='flex items-center'>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step <= getStepNumber()
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step < getStepNumber() ? '✓' : step}
                </div>
                {step < 5 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      step < getStepNumber()
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                        : 'bg-gray-200'
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
          <div className='text-center'>
            <h2 className='text-xl font-semibold text-gray-900'>
              {stepTitles[currentStep]}
            </h2>
            <p className='text-sm text-gray-500'>Step {getStepNumber()} of 5</p>
          </div>
        </div>

        {/* Main Content */}
        <div className='bg-white rounded-2xl shadow-xl p-8'>
          {error && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
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
                <span className='text-red-700 text-sm'>{error}</span>
              </div>
            </div>
          )}

          {/* Username Step */}
          {currentStep === 'username' && (
            <div className='space-y-6'>
              <div className='text-center mb-6'>
                <div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-8 h-8 text-blue-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                    />
                  </svg>
                </div>
                <p className='text-gray-600'>
                  Choose a unique username for your wallet
                </p>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Username
                </label>
                <input
                  type='text'
                  value={formData.username}
                  onChange={e =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder='Enter your username'
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg'
                  onKeyDown={e => e.key === 'Enter' && handleUsernameNext()}
                />
              </div>

              <button
                onClick={handleUsernameNext}
                className='w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg transition duration-200'
              >
                Continue
              </button>
            </div>
          )}

          {/* Password Step */}
          {currentStep === 'password' && (
            <div className='space-y-6'>
              <div className='text-center mb-6'>
                <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-8 h-8 text-green-600'
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
                <p className='text-gray-600'>
                  Set a 6-digit transaction password
                </p>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-4 text-center'>
                  Transaction Password
                </label>
                <div className='flex justify-center space-x-3'>
                  {formData.password.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => {
                        passwordRefs.current[index] = el;
                      }}
                      type='password'
                      inputMode='numeric'
                      pattern='[0-9]'
                      maxLength={1}
                      value={digit}
                      onChange={e =>
                        handlePasswordChange(index, e.target.value)
                      }
                      onKeyDown={e => handleKeyDown(index, e, false)}
                      className='w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none'
                    />
                  ))}
                </div>
                <p className='text-xs text-gray-500 text-center mt-2'>
                  Enter 6 digits for your transaction password
                </p>
              </div>

              <button
                onClick={handleBack}
                className='w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition duration-200'
              >
                ← Back
              </button>
            </div>
          )}

          {/* Confirm Password Step */}
          {currentStep === 'confirm' && (
            <div className='space-y-6'>
              <div className='text-center mb-6'>
                <div className='w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-8 h-8 text-yellow-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <p className='text-gray-600'>
                  Confirm your transaction password
                </p>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-4 text-center'>
                  Confirm Password
                </label>
                <div className='flex justify-center space-x-3'>
                  {formData.confirmPassword.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => {
                        confirmRefs.current[index] = el;
                      }}
                      type='password'
                      inputMode='numeric'
                      pattern='[0-9]'
                      maxLength={1}
                      value={digit}
                      onChange={e => handleConfirmChange(index, e.target.value)}
                      onKeyDown={e => handleKeyDown(index, e, true)}
                      className='w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none'
                    />
                  ))}
                </div>
                <p className='text-xs text-gray-500 text-center mt-2'>
                  Re-enter your 6-digit password
                </p>
              </div>

              <div className='space-y-3'>
                <button
                  onClick={() => {
                    const password = formData.confirmPassword.join('');
                    if (password.length === 6) {
                      handlePasswordConfirm();
                    } else {
                      setError('Please enter all 6 digits');
                    }
                  }}
                  disabled={formData.confirmPassword.join('').length !== 6}
                  className='w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:cursor-not-allowed'
                >
                  Confirm Password
                </button>

                <button
                  onClick={handleBack}
                  className='w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition duration-200'
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* Review Step */}
          {currentStep === 'review' && (
            <div className='space-y-6'>
              <div className='text-center mb-6'>
                <div className='w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-8 h-8 text-purple-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                    />
                  </svg>
                </div>
                <p className='text-gray-600'>Review your wallet details</p>
              </div>

              <div className='space-y-4'>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>Username:</span>
                    <span className='font-medium'>{formData.username}</span>
                  </div>
                </div>

                <div className='bg-gray-50 rounded-lg p-4'>
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>Network:</span>
                    <span className='font-medium'>BSC Mainnet</span>
                  </div>
                </div>

                <div className='bg-gray-50 rounded-lg p-4'>
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>Transaction Password:</span>
                    <span className='font-medium'>{'●'.repeat(6)}</span>
                  </div>
                </div>
              </div>

              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
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
                  <div className='text-blue-800 text-sm'>
                    <p className='font-medium mb-1'>Important Notice</p>
                    <p>
                      Your wallet will be created on BSC Mainnet with real
                      blockchain integration. Keep your private keys and
                      transaction password safe!
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-3'>
                <button
                  onClick={handleCreateWallet}
                  disabled={loading}
                  className='w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed'
                >
                  Create Wallet
                </button>

                <button
                  onClick={handleBack}
                  disabled={loading}
                  className='w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50'
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* Creating Step */}
          {currentStep === 'creating' && (
            <div className='space-y-6 text-center'>
              <div className='w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto'>
                <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-white'></div>
              </div>

              <div>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                  Creating Your Wallet
                </h3>
                <p className='text-gray-600'>
                  Please wait while we set up your BSC Mainnet wallet...
                </p>
              </div>

              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                <div className='space-y-2 text-sm text-blue-800'>
                  <div className='flex items-center'>
                    <div className='animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2'></div>
                    Generating cryptographic keys...
                  </div>
                  <div className='flex items-center'>
                    <div className='animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2'></div>
                    Creating BSC Mainnet address...
                  </div>
                  <div className='flex items-center'>
                    <div className='animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2'></div>
                    Setting up virtual card...
                  </div>
                  <div className='flex items-center'>
                    <div className='animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2'></div>
                    Fetching blockchain data...
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='text-center mt-6'>
          <Link
            href='/'
            className='text-sm text-gray-500 hover:text-gray-700 transition duration-200'
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
