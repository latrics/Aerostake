'use client';

import { useState, useEffect, useCallback } from 'react';
import { usersApi } from './api';
import { UserProfile, UserCreatePayload } from './types';

export function useUsers(roleFilter?: string) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.listUsers(roleFilter);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (payload: UserCreatePayload) => {
    const newUser = await usersApi.createUser(payload);
    await fetchUsers();
    return newUser;
  };

  return { users, loading, error, refetch: fetchUsers, createUser };
}
