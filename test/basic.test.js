const chai = require('chai');

const expect = chai.expect;

describe('Mocha', () => {
  describe('basic check of testing library', () => {
    it('assert that JavaScript is still a little crazy', () => {
      expect([] + []).to.eql('');
    });
  });
});
