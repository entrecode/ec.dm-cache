const chai = require('chai');

const expect = chai.expect;

describe('Mocha', function() {
  describe('basic check of testing library', function() {
    it('assert that JavaScript is still a little crazy', function() {
      expect([] + []).to.eql('');
    });
  });
});
