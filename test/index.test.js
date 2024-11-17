const request = require('supertest');
const chai = require('chai');
const expect = chai.expect;
const app = require('../app'); // Assurez-vous que l'application Express est exportée correctement
const sinon = require('sinon');
const nodemailer = require('nodemailer');

describe('GET /', () => {
  it('should render the index page', async () => {
    const response = await request(app).get('/');
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Accueil');
  });
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
  });
});

describe('GET /clients', () => {
  it('should render the clients list page', async () => {
    const response = await request(app).get('/clients');
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Liste des clients');
  });
});

describe('GET /client/:id', () => {
  it('should render the client details page', async () => {
    const clientId = 'testClientId';
    const response = await request(app).get(`/client/${clientId}`);
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Fiche Client');
  });
});

describe('POST /client/:id/edit', () => {
  it('should edit a client', async () => {
    const clientId = 'testClientId';
    const response = await request(app)
      .post(`/client/${clientId}/edit`)
      .field('nom', 'Updated')
      .field('prenom', 'Client')
      .field('adresse', '123 Rue Updated')
      .field('ville', 'Updatedville')
      .field('code_postal', '54321')
      .field('type_renovation', 'point singulier')
      .field('email', 'updated@example.com')
      .field('telephone', '9876543210')
      .field('superficie', '200')
      .field('type_batiment', 'residence')
      .field('status', 'validée')
      .field('statutTravaux', 'travaux en cours')
      .field('nomCommercial', 'Updated Commercial')
      .field('emailCommercial', 'updated.commercial@example.com')
      .field('telephoneCommercial', '0123456789');
    expect(response.status).to.equal(302); // Redirection après mise à jour
  });
});

describe('GET /clients-en-attente', () => {
  it('should render the pending clients list page', async () => {
    const response = await request(app).get('/clients-en-attente');
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Clients en attente');
  });
});

describe('GET /add-user', () => {
  it('should render the add user page', async () => {
    const response = await request(app).get('/add-user');
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Ajouter un utilisateur');
  });
});

describe('POST /add-user', () => {
  it('should add a new user', async () => {
    const response = await request(app)
      .post('/add-user')
      .field('nom', 'Test')
      .field('prenom', 'User')
      .field('email', 'user@example.com')
      .field('telephone', '0123456789')
      .field('expirationDate', '2023-12-31')
      .field('isSuperUser', 'false');
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Action effectuée avec succès');
  });
});

describe('Email Sending', () => {
  let sendMailStub;

  beforeEach(() => {
    sendMailStub = sinon.stub(nodemailer.createTransport().constructor.prototype, 'sendMail').resolves();
  });

  afterEach(() => {
    sendMailStub.restore();
  });

  describe('GET /client/:id/send-to-dder', () => {
    it('should send an email to DDER', async () => {
      const clientId = 'testClientId';
      const response = await request(app).get(`/client/${clientId}/send-to-dder`);
      expect(response.status).to.equal(302); // Redirection après envoi
      expect(sendMailStub.calledOnce).to.be.true;
    });
  });

  describe('POST /client/:id/schedule', () => {
    it('should send a confirmation email to the client', async () => {
      const clientId = 'testClientId';
      const response = await request(app)
        .post(`/client/${clientId}/schedule`)
        .send({ date: '2023-12-31', time: '10:00' });
      expect(response.status).to.equal(302); // Redirection après envoi
      expect(sendMailStub.calledOnce).to.be.true;
    });
  });
});