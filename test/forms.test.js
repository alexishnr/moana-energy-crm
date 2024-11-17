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

describe('Formulaires et Routes', () => {
  let addDocStub;

  beforeEach(() => {
    addDocStub = sinon.stub(firestore, 'addDoc').resolves({ id: 'fakeId' });
  });

  afterEach(() => {
    addDocStub.restore();
  });

  describe('GET /ajouter-client', () => {
    it('should render the add client page', async () => {
      const response = await request(app).get('/ajouter-client');
      expect(response.status).to.equal(200);
      expect(response.text).to.include('Ajouter un client');
    });
  });

  describe('POST /add-client', () => {
    it('should add a new client', async () => {
      const response = await request(app)
        .post('/add-client')
        .field('type_client', 'particulier')
        .field('nom', 'Test')
        .field('prenom', 'Client')
        .field('adresse', '123 Rue Test')
        .field('ville', 'Testville')
        .field('code_postal', '12345')
        .field('type_renovation', 'calorifugeage')
        .field('email', 'test@example.com')
        .field('telephone', '0123456789')
        .field('superficie', '100')
        .field('type_batiment', 'maison');
      expect(response.status).to.equal(200);
      expect(response.text).to.include('Action effectuée avec succès');
      expect(addDocStub.calledOnce).to.be.true;
    });
  });

  describe('GET /auth/add-user', () => {
    it('should render the add user page', async () => {
      const response = await request(app).get('/auth/add-user');
      expect(response.status).to.equal(200);
      expect(response.text).to.include('Ajouter un utilisateur');
    });
  });

  describe('POST /auth/add-user', () => {
    it('should add a new user', async () => {
      const response = await request(app)
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
      expect(addDocStub.calledOnce).to.be.true;
    });
  });

  describe('GET /clients-en-attente', () => {
    it('should render the pending clients list page', async () => {
      const response = await request(app).get('/clients-en-attente');
      expect(response.status).to.equal(200);
      expect(response.text).to.include('Clients en attente');
    });
  });

  describe('Client Filters and Sorting', () => {
    it('should filter clients by city', async () => {
      const response = await request(app).get('/clients-en-attente');
      expect(response.status).to.equal(200);
      expect(response.text).to.include('Filtrer par ville');
    });

    it('should filter clients by renovation type', async () => {
      const response = await request(app).get('/clients-en-attente');
      expect(response.status).to.equal(200);
      expect(response.text).to.include('Filtrer par type de rénovation');
    });

    it('should sort clients by name', async () => {
      const response = await request(app).get('/clients-en-attente');
      expect(response.status).to.equal(200);
      expect(response.text).to.include('Trier par nom');
    });

    it('should search clients by name', async () => {
      const response = await request(app).get('/clients-en-attente');
      expect(response.status).to.equal(200);
      expect(response.text).to.include('Rechercher un client...');
    });
  });
});