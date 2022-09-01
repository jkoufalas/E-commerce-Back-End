const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

// The `/api/products` endpoint

// get all products
router.get('/', async (req, res) => {
  // find all products
  // be sure to include its associated Category and Tag data
  try {
    const productData = await Product.findAll({
      // find all results to category and to tag via productTag
      include: [{ model: Category }, { model: Tag, through: ProductTag, as: 'tags' }],
    });
    res.status(200).json(productData);
  } catch (err) {
    res.status(500).json(err);
  }
});

// get one product
router.get('/:id', async (req, res) => {
  // find a single product by its `id`
  // be sure to include its associated Category and Tag data
  try {
    const productData = await Product.findByPk(req.params.id, {
      // find entry from primary key link to category and to tag via productTag
      include: [{ model: Category }, { model: Tag, through: ProductTag, as: 'tags' }],
    });
    res.status(200).json(productData);
  } catch (err) {
    res.status(500).json(err);
  }
});

// create new product
router.post('/', (req, res) => {
  /* req.body should look like this...
    {
      product_name: "Basketball",
      price: 200.00,
      stock: 3,
      tagIds: [1, 2, 3, 4]
    }
  */
  Product.create(req.body)
      //create product from body using ORM sequalize
    .then((product) => {
      // if there's product tags, we need to create pairings to bulk create in the ProductTag model
      if (req.body.tagIds.length) {
      //from the tagIds array submitted, cycle through each item 
        const productTagIdArr = req.body.tagIds.map((tag_id) => {
        //create object that is a ProductTag for each tag to current product.
          return {
            product_id: product.id,
            tag_id,
          };
        });
        // now with the arary of product tag JSON objects bulk add those to ProductTag
        return ProductTag.bulkCreate(productTagIdArr);
      }
      // if no product tags, just respond
      res.status(200).json(product);
    })
    .then((productTagIds) => res.status(200).json(productTagIds))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// update product
router.put('/:id', (req, res) => {
  // update product data
  Product.update(req.body, {
  //update product from body using ORM sequalize
  where: {
      id: req.params.id,
    },
  })
    .then((product) => {
      // find all associated tags from ProductTag
      return ProductTag.findAll({ where: { product_id: req.params.id } });
    })
    .then((productTags) => {
      // with list of ProductTags from the product id, make array of all productIds that went with it
      const productTagIds = productTags.map(({ tag_id }) => tag_id);
      // create filtered list of new tag_ids
      const newProductTags = req.body.tagIds
        //filter list where productIds from input array aren't in the current map of ProductTags
        .filter((tag_id) => !productTagIds.includes(tag_id))
        //then map that tag_id as JSON object of ProductTag and add to array
        .map((tag_id) => {
          return {
            product_id: req.params.id,
            tag_id,
          };
        });
      // figure out which ones to remove by comparing current list of product tags for products, to update list
      // any in current list that not in update list then add as ones that need to be removed
      const productTagsToRemove = productTags
        .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
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
      // console.log(err);
      res.status(400).json(err);
    });
});

router.delete('/:id', async (req, res) => {
  // delete one product by its `id` value
  try {
    //delete tag with id
    const productTags = await Product.destroy({
      where: {
        id: req.params.id
      }
    });

    if (!productTags) {
      res.status(404).json({ message: 'No Product found with this id!' });
      return;
    }

    res.status(200).json(productTags);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
