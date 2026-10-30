import { jest } from '@jest/globals';
import UsersController from '../../src/modules/users/users.controller.js';
import UsersService from '../../src/modules/users/users.service.js';

describe('UsersController Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockReq = {
    user: { id: 'user_1', sessionId: 'sess_1' },
    params: {},
    body: {}
  };

  const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  };

  it('should get profile', async () => {
    jest.spyOn(UsersService, 'getProfile').mockResolvedValue({ id: 'user_1', name: 'User 1' });
    const res = createMockRes();
    const next = jest.fn();

    await UsersController.getProfile(mockReq, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should update profile', async () => {
    jest.spyOn(UsersService, 'updateProfile').mockResolvedValue({ id: 'user_1', name: 'Updated' });
    const res = createMockRes();
    const next = jest.fn();

    await UsersController.updateProfile({ ...mockReq, body: { name: 'Updated' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should get account status', async () => {
    jest.spyOn(UsersService, 'getAccountStatus').mockResolvedValue({ isActive: true });
    const res = createMockRes();
    const next = jest.fn();

    await UsersController.getAccountStatus(mockReq, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should deactivate account and clear cookie', async () => {
    jest.spyOn(UsersService, 'deactivateAccount').mockResolvedValue({ message: 'Deactivated' });
    const res = createMockRes();
    const next = jest.fn();

    await UsersController.deactivateAccount(mockReq, res, next);
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should get active sessions', async () => {
    jest
      .spyOn(UsersService, 'getActiveSessions')
      .mockResolvedValue([{ id: 'sess_1', isCurrent: true }]);
    const res = createMockRes();
    const next = jest.fn();

    await UsersController.getSessions(mockReq, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should revoke session and clear cookie if current session revoked', async () => {
    jest.spyOn(UsersService, 'revokeSession').mockResolvedValue({ message: 'Revoked' });
    const res = createMockRes();
    const next = jest.fn();

    await UsersController.revokeSession({ ...mockReq, params: { sessionId: 'sess_1' } }, res, next);
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should revoke all other sessions', async () => {
    jest
      .spyOn(UsersService, 'revokeAllOtherSessions')
      .mockResolvedValue({ message: 'All other revoked' });
    const res = createMockRes();
    const next = jest.fn();

    await UsersController.revokeAllOtherSessions(mockReq, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
