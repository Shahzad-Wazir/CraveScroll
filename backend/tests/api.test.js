process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_cravescroll_12345';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

jest.mock('../src/models/user.model');
jest.mock('../src/models/foodpartner.model');
jest.mock('../src/models/food.model');
jest.mock('../src/models/likes.model');
jest.mock('../src/models/save.model');
jest.mock('../src/models/comment.model');
jest.mock('../src/models/follow.model');
jest.mock('../src/models/revokedToken.model');
jest.mock('../src/services/storage.service');

const userModel = require('../src/models/user.model');
const foodPartnerModel = require('../src/models/foodpartner.model');
const foodModel = require('../src/models/food.model');
const likeModel = require('../src/models/likes.model');
const saveModel = require('../src/models/save.model');
const commentModel = require('../src/models/comment.model');
const followModel = require('../src/models/follow.model');
const revokedTokenModel = require('../src/models/revokedToken.model');
const storageService = require('../src/services/storage.service');

const app = require('../src/app');

const USER_ID = new mongoose.Types.ObjectId().toString();
const OTHER_USER_ID = new mongoose.Types.ObjectId().toString();
const PARTNER_ID = new mongoose.Types.ObjectId().toString();
const OTHER_PARTNER_ID = new mongoose.Types.ObjectId().toString();
const FOOD_ID = new mongoose.Types.ObjectId().toString();
const COMMENT_ID = new mongoose.Types.ObjectId().toString();

const makeToken = (id, role, jti = 'jti-1') =>
  jwt.sign({ id, role, jti }, process.env.JWT_SECRET, { expiresIn: '1h' });

const mockUser = { _id: USER_ID, fullName: 'Aarav Test', email: 'aarav@test.com' };
const mockPartner = { _id: PARTNER_ID, name: 'Spice Kitchen', email: 'spice@test.com' };

// Helper to create valid MP4 magic-byte buffer (ftyp header)
const validMp4Buffer = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
  0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00,
]);

beforeEach(() => {
  jest.clearAllMocks();
  revokedTokenModel.exists.mockResolvedValue(null);
  revokedTokenModel.updateOne.mockResolvedValue({ acknowledged: true });
  userModel.findById.mockReturnValue({
    select: jest.fn().mockResolvedValue(mockUser),
  });
  foodPartnerModel.findById.mockReturnValue({
    select: jest.fn().mockResolvedValue(mockPartner),
  });
});

describe('1. Health & Routing', () => {
  test('GET /health returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('Unknown route returns 404 JSON', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.statusCode).toBe(404);
  });
});

describe('2. Authentication', () => {
  test('Successful user registration', async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue({ ...mockUser, createdAt: new Date() });

    const res = await request(app)
      .post('/api/auth/user/register')
      .send({ fullName: 'Aarav Test', email: 'aarav@test.com', password: 'Password123' });

    expect(res.statusCode).toBe(201);
    expect(res.body.role).toBe('user');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('Duplicate email registration returns 409', async () => {
    userModel.findOne.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/user/register')
      .send({ fullName: 'Aarav Test', email: 'aarav@test.com', password: 'Password123' });

    expect(res.statusCode).toBe(409);
  });

  test('Successful user login', async () => {
    const hash = await bcrypt.hash('Password123', 4);
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ ...mockUser, password: hash }),
    });

    const res = await request(app)
      .post('/api/auth/user/login')
      .send({ email: 'aarav@test.com', password: 'Password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('aarav@test.com');
  });

  test('Wrong password returns 401', async () => {
    const hash = await bcrypt.hash('Password123', 4);
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ ...mockUser, password: hash }),
    });

    const res = await request(app)
      .post('/api/auth/user/login')
      .send({ email: 'aarav@test.com', password: 'WrongPassword' });

    expect(res.statusCode).toBe(401);
  });

  test('Logout revokes token and returns 200', async () => {
    const token = makeToken(USER_ID, 'user', 'jti-logout');
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`token=${token}`]);

    expect(res.statusCode).toBe(200);
    expect(revokedTokenModel.updateOne).toHaveBeenCalled();
  });

  test('Revoked or invalid token returns 401', async () => {
    revokedTokenModel.exists.mockResolvedValue({ _id: 'revoked' });
    const token = makeToken(USER_ID, 'user', 'jti-revoked');

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`token=${token}`]);

    expect(res.statusCode).toBe(401);
  });
});

describe('3. Food CRUD & Authorization', () => {
  test('Successful food creation by partner with valid MP4 signature', async () => {
    storageService.uploadFile.mockResolvedValue({ url: 'https://ik.imagekit.io/demo/v.mp4', fileId: 'file_1' });
    foodModel.create.mockResolvedValue({ _id: FOOD_ID, name: 'Paneer Wrap', foodPartner: PARTNER_ID });
    foodModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: FOOD_ID, name: 'Paneer Wrap', foodPartner: mockPartner }),
      }),
    });

    const res = await request(app)
      .post('/api/food')
      .set('Cookie', [`token=${makeToken(PARTNER_ID, 'foodpartner')}`])
      .field('name', 'Paneer Wrap')
      .field('price', '149')
      .field('category', 'Street Food')
      .field('dietType', 'Veg')
      .attach('video', validMp4Buffer, { filename: 'dish.mp4', contentType: 'video/mp4' });

    expect(res.statusCode).toBe(201);
    expect(res.body.food.name).toBe('Paneer Wrap');
  });

  test('Corrupted/spoofed video buffer is rejected with 400', async () => {
    const fakeBuffer = Buffer.from('this-is-not-a-real-mp4-video');
    const res = await request(app)
      .post('/api/food')
      .set('Cookie', [`token=${makeToken(PARTNER_ID, 'foodpartner')}`])
      .field('name', 'Paneer Wrap')
      .attach('video', fakeBuffer, { filename: 'fake.mp4', contentType: 'video/mp4' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/signature/i);
  });

  test('Normal user cannot access partner-only POST /api/food (403)', async () => {
    const res = await request(app)
      .post('/api/food')
      .set('Cookie', [`token=${makeToken(USER_ID, 'user')}`]);

    expect(res.statusCode).toBe(403);
  });

  test('Partner can edit own food reel', async () => {
    const saveMock = jest.fn().mockResolvedValue(true);
    foodModel.findById.mockResolvedValue({
      _id: FOOD_ID,
      name: 'Old Name',
      foodPartner: PARTNER_ID,
      save: saveMock,
    });

    const res = await request(app)
      .patch(`/api/food/${FOOD_ID}`)
      .set('Cookie', [`token=${makeToken(PARTNER_ID, 'foodpartner')}`])
      .send({ name: 'New Dish Name', price: 199 });

    expect(res.statusCode).toBe(200);
    expect(saveMock).toHaveBeenCalled();
  });

  test('Partner cannot edit another partner food reel (403)', async () => {
    foodModel.findById.mockResolvedValue({
      _id: FOOD_ID,
      name: 'Other Dish',
      foodPartner: OTHER_PARTNER_ID,
    });

    const res = await request(app)
      .patch(`/api/food/${FOOD_ID}`)
      .set('Cookie', [`token=${makeToken(PARTNER_ID, 'foodpartner')}`])
      .send({ name: 'Hijack Attempt' });

    expect(res.statusCode).toBe(403);
  });

  test('Partner deletes own food reel (DB-first, then media cleanup)', async () => {
    foodModel.findById.mockResolvedValue({
      _id: FOOD_ID,
      foodPartner: PARTNER_ID,
      videoFileId: 'ik_file_99',
    });
    foodModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
    likeModel.deleteMany.mockResolvedValue({});
    saveModel.deleteMany.mockResolvedValue({});
    commentModel.deleteMany.mockResolvedValue({});
    storageService.deleteFileOrTrackOrphan.mockResolvedValue(true);

    const res = await request(app)
      .delete(`/api/food/${FOOD_ID}`)
      .set('Cookie', [`token=${makeToken(PARTNER_ID, 'foodpartner')}`]);

    expect(res.statusCode).toBe(200);
    expect(foodModel.deleteOne).toHaveBeenCalled();
    expect(storageService.deleteFileOrTrackOrphan).toHaveBeenCalledWith(
      'ik_file_99',
      'video',
      expect.any(String)
    );
  });
});

describe('4. Idempotent Social APIs (Like, Save, Follow)', () => {
  test('PUT /api/food/:id/like is idempotent on duplicate 11000 error', async () => {
    foodModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ likeCount: 5 }) }),
    });
    const dupErr = new Error('dup');
    dupErr.code = 11000;
    likeModel.create.mockRejectedValue(dupErr);

    const res = await request(app)
      .put(`/api/food/${FOOD_ID}/like`)
      .set('Cookie', [`token=${makeToken(USER_ID, 'user')}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.liked).toBe(true);
    expect(res.body.likeCount).toBe(5);
  });

  test('DELETE /api/food/:id/like unlikes cleanly', async () => {
    likeModel.findOneAndDelete.mockResolvedValue({ _id: 'l1' });
    foodModel.findOneAndUpdate.mockResolvedValue({ likeCount: 4 });

    const res = await request(app)
      .delete(`/api/food/${FOOD_ID}/like`)
      .set('Cookie', [`token=${makeToken(USER_ID, 'user')}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.liked).toBe(false);
    expect(res.body.likeCount).toBe(4);
  });

  test('PUT and DELETE /api/food/:id/save work idempotently', async () => {
    foodModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ savesCount: 1 }) }),
    });
    saveModel.create.mockResolvedValue([{ _id: 's1' }]);
    foodModel.findByIdAndUpdate.mockResolvedValue({ savesCount: 2 });

    const putRes = await request(app)
      .put(`/api/food/${FOOD_ID}/save`)
      .set('Cookie', [`token=${makeToken(USER_ID, 'user')}`]);
    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.saved).toBe(true);

    saveModel.findOneAndDelete.mockResolvedValue({ _id: 's1' });
    foodModel.findOneAndUpdate.mockResolvedValue({ savesCount: 1 });
    const delRes = await request(app)
      .delete(`/api/food/${FOOD_ID}/save`)
      .set('Cookie', [`token=${makeToken(USER_ID, 'user')}`]);
    expect(delRes.statusCode).toBe(200);
    expect(delRes.body.saved).toBe(false);
  });

  test('PUT and DELETE /api/food-partner/:id/follow work idempotently', async () => {
    foodPartnerModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ followersCount: 10 }) }),
    });
    followModel.create.mockResolvedValue([{ _id: 'f1' }]);
    foodPartnerModel.findByIdAndUpdate.mockResolvedValue({ followersCount: 11 });

    const followRes = await request(app)
      .put(`/api/food-partner/${PARTNER_ID}/follow`)
      .set('Cookie', [`token=${makeToken(USER_ID, 'user')}`]);
    expect(followRes.statusCode).toBe(200);
    expect(followRes.body.following).toBe(true);

    followModel.findOneAndDelete.mockResolvedValue({ _id: 'f1' });
    foodPartnerModel.findOneAndUpdate.mockResolvedValue({ followersCount: 10 });
    const unfollowRes = await request(app)
      .delete(`/api/food-partner/${PARTNER_ID}/follow`)
      .set('Cookie', [`token=${makeToken(USER_ID, 'user')}`]);
    expect(unfollowRes.statusCode).toBe(200);
    expect(unfollowRes.body.following).toBe(false);
  });
});

describe('5. Comments CRUD & Permissions', () => {
  test('Authenticated user can add a comment', async () => {
    foodModel.exists.mockResolvedValue({ _id: FOOD_ID });
    commentModel.create.mockResolvedValue([{ _id: COMMENT_ID, text: 'Yummy!', authorId: USER_ID }]);
    foodModel.findByIdAndUpdate.mockResolvedValue({ commentsCount: 1 });

    const res = await request(app)
      .post(`/api/food/${FOOD_ID}/comments`)
      .set('Cookie', [`token=${makeToken(USER_ID, 'user')}`])
      .send({ text: 'Yummy!' });

    expect(res.statusCode).toBe(201);
    expect(res.body.commentsCount).toBe(1);
  });

  test('User can delete own comment', async () => {
    commentModel.findOne.mockResolvedValue({ _id: COMMENT_ID, authorId: USER_ID });
    foodModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ foodPartner: PARTNER_ID }) }),
    });
    commentModel.findOneAndDelete.mockResolvedValue({ _id: COMMENT_ID });
    foodModel.findOneAndUpdate.mockResolvedValue({ commentsCount: 0 });

    const res = await request(app)
      .delete(`/api/food/${FOOD_ID}/comments/${COMMENT_ID}`)
      .set('Cookie', [`token=${makeToken(USER_ID, 'user')}`]);

    expect(res.statusCode).toBe(200);
    expect(res.body.commentsCount).toBe(0);
  });

  test('User cannot delete another user comment (403)', async () => {
    commentModel.findOne.mockResolvedValue({ _id: COMMENT_ID, authorId: OTHER_USER_ID });
    foodModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ foodPartner: PARTNER_ID }) }),
    });

    const res = await request(app)
      .delete(`/api/food/${FOOD_ID}/comments/${COMMENT_ID}`)
      .set('Cookie', [`token=${makeToken(USER_ID, 'user')}`]);

    expect(res.statusCode).toBe(403);
  });
});
