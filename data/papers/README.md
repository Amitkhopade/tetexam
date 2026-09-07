# Extracted sample fixtures

The `K/questions.json` and `L/questions.json` files were produced from the supplied 52-page sample PDFs.

Expected structure per booklet:
- 150 English question records
- 150 Hindi question records
- stable IDs by exam/booklet/question/language
- source PDF page + bounding box
- extraction confidence and status

The real official answer key is not included because it was not supplied with the build request. Put the official key into `data/answer_keys/<BOOKLET>/answer_key.json` using the importer.
