import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginPage from '../../app/pages/LoginPage';
import { Mock } from 'jest-mock';
import {Alert} from 'react-native';

// Mock the Alert API
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Alert = { alert: jest.fn() };
  return RN;
});

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all elements correctly', () => {
    const { getByPlaceholderText, getByText } = render(<LoginPage />);

    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
  });

  test('shows an alert if email and password are empty', () => {
    const { getByText } = render(<LoginPage />);

    fireEvent.press(getByText('Login'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter both email and password');
  });

  test('shows an alert for invalid email format', () => {
    const { getByPlaceholderText, getByText } = render(<LoginPage />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    expect(Alert.alert).toHaveBeenCalledWith('Invalid Email', 'Please enter a valid email address');
  });

  test('successful login with correct email and password', async () => {
    // Mock the authentication function to simulate a successful login
    const mockAuthenticate = jest.fn().mockResolvedValue(true);
    const { getByPlaceholderText, getByText } = render(<LoginPage mockAuthenticate={mockAuthenticate} />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Success', 'Logged in successfully'));
  });

  test('failed login with incorrect email or password', async () => {
    const mockAuthenticate = jest.fn().mockResolvedValue(false);
    const { getByPlaceholderText, getByText } = render(<LoginPage mockAuthenticate={mockAuthenticate} />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpassword');
    fireEvent.press(getByText('Login'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Login Failed', 'Invalid email or password'));
  });
});
