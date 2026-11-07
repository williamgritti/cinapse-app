import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPosterFields, parseMovieLine } from "../scripts/backfill-posters.js";

const line = `  {title:"Hereditário",original_title:"Hereditary",year:"2018",director:"Ari Aster",genres:["Terror"],runtime:127,rating:7.3,overview:"Após a \\"morte\\".",cast:["Toni Collette"],streaming:[{name:"Max",type:"sub"}]},`;

test("parseMovieLine lê título, título original e ano", () => {
  assert.deepEqual(parseMovieLine(line), {
    title: "Hereditário",
    original_title: "Hereditary",
    year: "2018",
  });
});

test("parseMovieLine ignora entradas que já têm poster_path", () => {
  const filled = line.replace("streaming:", `poster_path:"/ja.jpg",tmdb_id:1,streaming:`);
  assert.equal(parseMovieLine(filled), null);
});

test("applyPosterFields acrescenta poster_path e tmdb_id sem mexer no restante", () => {
  assert.equal(
    applyPosterFields(line, "/poster.jpg", 42),
    line.replace(/},$/, `,poster_path:"/poster.jpg",tmdb_id:42},`),
  );
});

test("applyPosterFields grava poster nulo quando o TMDb não tem pôster", () => {
  assert.equal(
    applyPosterFields(line, null, 7),
    line.replace(/},$/, ",poster_path:null,tmdb_id:7},"),
  );
});
