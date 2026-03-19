module.exports = {
  CID: {
    parse: (cid) => {
      if (!cid || typeof cid !== 'string') throw new Error('invalid');
      return {};
    },
  },
};
