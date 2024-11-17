
const request = require('supertest');
const chai = require('chai');
const expect = chai.expect;
const app = require('../app'); // Assurez-vous que l'application Express est exportée correctement

describe('GET /', () => {
  it('should render the index page', async () => {
    const response = await request(app).get('/');
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Bienvenue sur le CRM de Moana Energy');
  });
});

describe('GET /ajouter-client', () => {
  it('should render the add client page', async () => {
    const response = await request(app).get('/ajouter-client');
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Ajouter un client');
  });
});

describe('GET /clients', () => {
  it('should render the clients list page', async () => {
    const response = await request(app).get('/clients');
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Liste clients');
  });
});

describe('GET /clients-en-attente', () => {
  it('should render the pending clients list page', async () => {
    const response = await request(app).get('/clients-en-attente');
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Clients en attente');
  });
});

describe('GET /client/:id', () => {
  it('should render the client details page', async () => {
    const clientId = 'testClientId';
    const response = await request(app).get(`/client/${clientId}`);
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Fiche client');
  });
});

describe('GET /add-user', () => {
  it('should render the add user page', async () => {
    const response = await request(app).get('/add-user');
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Ajouter un utilisateur');
  });
});

describe('GET /faq', () => {
  it('should render the FAQ page', async () => {
    const response = await request(app).get('/faq');
    expect(response.status).to.equal(200);
    expect(response.text).to.include('FAQ - Dashboard Moana Energy');
  });
});