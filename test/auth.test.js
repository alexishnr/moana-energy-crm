const request = require('supertest');
const chai = require('chai');
const expect = chai.expect;
const app = require('../app'); // Assurez-vous que l'application Express est exportée correctement
const sinon = require('sinon');
const admin = require('firebase-admin'); // Importer Firebase Admin SDK

// Initialiser Firestore
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    })
  });
}
const firestore = admin.firestore();

describe('Auth Routes', () => {
  let getDocStub;
  let createUserStub;
  let setDocStub;

  beforeEach(() => {
    getDocStub = sinon.stub(firestore, 'doc').returns({
      get: sinon.stub().resolves({
        exists: true,
        data: () => ({ isSuperUser: true })
      })
    });
    createUserStub = sinon.stub(admin.auth(), 'createUser').resolves({ uid: 'fakeUid', isSuperUser: true, displayName: 'Test User' });
    setDocStub = sinon.stub(firestore, 'collection').returns({
      doc: sinon.stub().returns({
        set: sinon.stub().resolves()
      })
    });
  });

  afterEach(() => {
    getDocStub.restore();
    createUserStub.restore();
    setDocStub.restore();
  });

  describe('GET /auth/login', () => {
    it('should render the login page', async () => {
      const response = await request(app).get('/auth/login');
      expect(response.status).to.equal(200);
      expect(response.text).to.include('Connexion');
    });
  });

  describe('POST /auth/login', () => {
    it('should log in a user', async () => {
      const agent = request.agent(app);
      const response = await agent
        .post('/auth/login')
        .send({ email: 'superuser@moanaenergy.com', password: 'aaaaaa' });
      expect(response.status).to.equal(302); // Redirection après connexion réussie
      expect(response.headers.location).to.equal('/'); // Vérifier la redirection vers la page d'accueil

      // Vérifier que les sessions sont définies correctement
      expect(agent.jar.getCookie('connect.sid', { path: '/' })).to.exist;
      expect(agent.jar.getCookie('connect.sid', { path: '/' }).value).to.not.be.empty;
    });
  });

  describe('GET /auth/add-user', () => {
    it('should render the add user page', async () => {
      const agent = request.agent(app);
      await agent.post('/auth/login').send({ email: 'superuser@moanaenergy.com', password: 'aaaaaa' });
      agent.jar.setCookie('connect.sid', 'fakeSessionId');
      agent.jar.setCookie('isSuperUser', 'true');

      const response = await agent.get('/auth/add-user');
      expect(response.status).to.equal(200);
      expect(response.text).to.include('Ajouter un utilisateur');
    });
  });

  describe('POST /auth/add-user', () => {
    it('should add a new user', async () => {
      // Simuler l'authentification et le statut de super utilisateur
      const agent = request.agent(app);
      await agent.post('/auth/login').send({ email: 'superuser@moanaenergy.com', password: 'aaaaaa' });

      const response = await agent
        .post('/auth/add-user')
        .send({
          nom: 'Test',
          prenom: 'User',
          email: 'user@example.com',
          telephone: '0123456789',
          expirationDate: '2023-12-31',
          isSuperUser: 'false'
        });
      expect(response.status).to.equal(200);
      expect(response.text).to.include('Action effectuée avec succès');
    });
  });

  describe('GET /auth/logout', () => {
    it('should log out a user', async () => {
      const response = await request(app).get('/auth/logout');
      expect(response.status).to.equal(302); // Redirection après déconnexion
    });
  });

  describe('Middleware isAuthenticated', () => {
    it('should protect routes', async () => {
      const response = await request(app).get('/');
      expect(response.status).to.equal(302); // Redirection vers la page de connexion
    });
  });

  describe('Middleware isSuperUser', () => {
    it('should verify if user is super user', async () => {
      const agent = request.agent(app);
      await agent.post('/auth/login').send({ email: 'superuser@moanaenergy.com', password: 'aaaaaa' });
      agent.jar.setCookie('connect.sid', 'fakeSessionId');
      agent.jar.setCookie('isSuperUser', 'true');

      const response = await agent.get('/auth/add-user');
      expect(response.status).to.equal(200);
      expect(response.text).to.include('Ajouter un utilisateur');
      expect(getDocStub.calledOnce).to.be.true;
    });
  });

  describe('POST /auth/logout', () => {
    it('should log out a user and destroy session', async () => {
      const agent = request.agent(app);
      await agent.post('/auth/login').send({ email: 'test@example.com', password: 'password123' });
      const response = await agent.get('/auth/logout');
      expect(response.status).to.equal(302); // Redirection après déconnexion
      const protectedResponse = await agent.get('/');
      expect(protectedResponse.status).to.equal(302); // Redirection vers la page de connexion
    });
  });
});