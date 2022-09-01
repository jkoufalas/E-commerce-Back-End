const router = require('express').Router();
const { Tag, Product, ProductTag } = require('../../models');

// The `/api/tags` endpoint

router.get('/', async (req, res) => {
  // find all tags
  // be sure to include its associated Product data
  try {
    const tagData = await Tag.findAll({
      include: [{ model: Product, through: ProductTag, as: 'products' }],
    });
    res.status(200).json(tagData);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get('/:id', async (req, res) => {
  // find a single tag by its `id`
  // be sure to include its associated Product data
  try {
    const tagData = await Tag.findByPk(req.params.id, {
      include: [{ model: Product, through: ProductTag, as: 'products' }],
    });
    res.status(200).json(tagData);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post('/', (req, res) => {
  // create a new tag
  /* req.body should look like this...
    {
      "tag_name": "street",
      "productIds": [5, 2, 3, 4]
    }
  */
    Tag.create(req.body)
    //create tag from body using ORM sequalize
    .then((tag) => {
      // if there's product tags, we need to create pairings to bulk create in the ProductTag model
      if (req.body.productIds.length) {
        //from the productIds array submitted, cycle through each item 
        const productTagIdArr = req.body.productIds.map((product_id) => {
          //create object that is a ProductTag for each product to current tag.
          return {
            tag_id: tag.id,
            product_id,
          };
        });
        // now with the arary of product tag JSON objects bulk add those to ProductTag
        return ProductTag.bulkCreate(productTagIdArr);
      }
      // if no product tags, just respond
      res.status(200).json(tag);
    })
    .then((productTagIds) => res.status(200).json(productTagIds))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

router.put('/:id', (req, res) => {
  // update a tag's name by its `id` value
  Tag.update(req.body, {
  //update tag from body using ORM sequalize
    where: {
      id: req.params.id,
    },
  })
    .then((tag) => {
      // find all associated tags from ProductTag
      return ProductTag.findAll({ where: { tag_id: req.params.id } });
    })
    .then((productTags) => {
      // with list of ProductTags from the tag id, make array of all productIds that went with it
      const productTagIds = productTags.map(({ product_id }) => product_id);
      // create filtered list of new product_ids
      const newProductTags = req.body.productIds
        //filter list where productIds from input array aren't in the current map of ProductTags
        .filter((product_id) => !productTagIds.includes(product_id))
        //then map that product_id as JSON object of ProductTag and add to array
        .map((product_id) => {
          return {
            tag_id: req.params.id,
            product_id,
          };
        });

      // figure out which ones to remove by comparing current list of product tags for tags, to update list
      // any in current list that not in update list then add as ones that need to be removed
      const productTagsToRemove = productTags
        .filter(({ product_id }) => !req.body.productIds.includes(product_id))
        .map(({ id }) => id);

      // run both actions
      return Promise.all([
        //get rid of all producttags on remove list
        ProductTag.destroy({ where: { id: productTagsToRemove } }),
        // add all producttags on new list
        ProductTag.bulkCreate(newProductTags),
      ]);
    })
    .then((updatedProductTags) => res.json(updatedProductTags))
    .catch((err) => {
      res.status(400).json(err);
    });


});

router.delete('/:id', async (req, res) => {
  // delete on tag by its `id` value
  try {
    //delete tag with id
    const tags = await Tag.destroy({
      where: {
        id: req.params.id
      }
    });
    //if no tag found with id to delete, then send response that there was no tag
    if (!tags) {
      res.status(404).json({ message: 'No Tag found with this id!' });
      return;
    }
    
    res.status(200).json(tags);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
