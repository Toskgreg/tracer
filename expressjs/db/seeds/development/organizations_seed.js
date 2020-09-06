exports.seed = function(knex, Promise) {
  return knex('organizations').del() // Deletes ALL existing entries
    .then(async function() { // Inserts seed entries one by one in series
      return knex('organizations').insert({
        id: 'a88309c2-26cd-4d2b-8923-af0779e423a3',
        authority_name: 'Ministry of Health',
        info_website: 'https://covid19.gou.go.ug/',
        safe_path_json: 'http://ec2-3-16-90-29.us-east-2.compute.amazonaws.com/safe_paths/a88309c2-26cd-4d2b-8923-af0779e423a3'
      });
    });
};
