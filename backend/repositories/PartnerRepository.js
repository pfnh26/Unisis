const BaseRepository = require('./BaseRepository');

class PartnerRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'partners');
    }
}

module.exports = PartnerRepository;
