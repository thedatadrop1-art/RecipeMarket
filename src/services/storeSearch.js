const axios = require('axios');

// ── Kroger API ─────────────────────────────────────────────────────
// Free tier: 10k req/day. Covers Kroger, Harris Teeter, Fred Meyer, Ralphs, Smith's
// Sign up: developer.kroger.com

let krogerToken = null;
let krogerTokenExpiry = 0;

async function getKrogerToken() {
  if (krogerToken && Date.now() < krogerTokenExpiry) return krogerToken;

  const res = await axios.post(
    'https://api.kroger.com/v1/connect/oauth2/token',
    'grant_type=client_credentials&scope=product.compact',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
    }
  );

  krogerToken = res.data.access_token;
  krogerTokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return krogerToken;
}

async function searchKroger({ ingredient, lat, lng }) {
  try {
    const token = await getKrogerToken();

    // Step 1: Find nearby Kroger locations
    const locRes = await axios.get('https://api.kroger.com/v1/locations', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        'filter.latLong.near': `${lat},${lng}`,
        'filter.radiusInMiles': 10,
        'filter.limit': 5,
      },
    });

    const locations = locRes.data.data || [];
    const results = [];

    for (const loc of locations.slice(0, 3)) {
      // Step 2: Search products at this location
      const prodRes = await axios.get('https://api.kroger.com/v1/products', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          'filter.term': ingredient,
          'filter.locationId': loc.locationId,
          'filter.limit': 1,
        },
      });

      const products = prodRes.data.data || [];
      const product  = products[0];
      const inStock  = product?.items?.[0]?.fulfillment?.inStore;
      const price    = product?.items?.[0]?.price?.regular;

      results.push({
        ingredient:    ingredient.toLowerCase(),
        store_id:      `kroger_${loc.locationId}`,
        store_name:    loc.name || 'Kroger',
        store_address: `${loc.address?.addressLine1}, ${loc.address?.city}, ${loc.address?.state}`,
        store_lat:     loc.geolocation?.latitude,
        store_lng:     loc.geolocation?.longitude,
        available:     inStock !== false,
        stock_level:   inStock ? 'in_stock' : 'out',
        price:         price || null,
        product_name:  product?.description || null,
        product_image: product?.images?.[0]?.sizes?.[0]?.url || null,
      });
    }

    return results;
  } catch (err) {
    console.error('Kroger API error:', err.message);
    return [];
  }
}

// ── Walmart Open API ───────────────────────────────────────────────
// Uses unofficial affiliate API — replace with Walmart Luminate when available
// Alternative: use SerpApi's Walmart endpoint

async function searchWalmart({ ingredient, lat, lng }) {
  try {
    const res = await axios.get('https://api.walmart.com/v3/items/search', {
      headers: {
        'WM_SEC.ACCESS_TOKEN': process.env.WALMART_ACCESS_TOKEN,
        'WM_CONSUMER.ID': process.env.WALMART_CONSUMER_ID,
        'WM_SVC.NAME': 'RecipeMarket',
        'WM_QOS.CORRELATION_ID': Date.now().toString(),
      },
      params: {
        query: ingredient,
        numItems: 1,
        responseGroup: 'base',
        storeId: await getNearestWalmartStore(lat, lng),
      },
    });

    const item = res.data?.items?.[0];
    if (!item) return [];

    return [{
      ingredient:    ingredient.toLowerCase(),
      store_id:      `walmart_${res.data.storeId || 'main'}`,
      store_name:    'Walmart',
      store_address: null, // fetched separately via store lookup
      store_lat:     lat,
      store_lng:     lng,
      available:     item.availableOnline !== false,
      stock_level:   item.stock === 'Available' ? 'in_stock' : 'low',
      price:         item.salePrice || item.msrp || null,
      product_name:  item.name || null,
      product_image: item.thumbnailImage || null,
    }];
  } catch (err) {
    console.error('Walmart API error:', err.message);
    return [];
  }
}

async function getNearestWalmartStore(lat, lng) {
  try {
    const res = await axios.get('https://api.walmart.com/v3/stores/nearest', {
      headers: { 'WM_CONSUMER.ID': process.env.WALMART_CONSUMER_ID },
      params: { lat, lon: lng, limit: 1 },
    });
    return res.data?.[0]?.no;
  } catch {
    return null;
  }
}

// ── Google Places  — find any nearby grocery store ─────────────────
// Used as fallback to fill in stores Kroger/Walmart don't cover

async function searchNearbyGroceryStores(lat, lng) {
  try {
    const res = await axios.get(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${lat},${lng}`,
          radius: 8000,
          type: 'grocery_or_supermarket',
          key: process.env.GOOGLE_PLACES_API_KEY,
        },
      }
    );

    return (res.data.results || []).slice(0, 5).map(place => ({
      store_id:      `google_${place.place_id}`,
      store_name:    place.name,
      store_address: place.vicinity,
      store_lat:     place.geometry.location.lat,
      store_lng:     place.geometry.location.lng,
      open_now:      place.opening_hours?.open_now,
      rating:        place.rating,
    }));
  } catch (err) {
    console.error('Google Places error:', err.message);
    return [];
  }
}

// ── SerpApi fallback  — works for most grocery stores ─────────────
// $50/mo for 5k searches — use as backup when Kroger/Walmart miss

async function searchViaSerpApi({ ingredient, storeId, storeName }) {
  try {
    const res = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_shopping',
        q: `${ingredient} ${storeName}`,
        api_key: process.env.SERPAPI_KEY,
        num: 1,
        gl: 'us',
      },
    });

    const result = res.data?.shopping_results?.[0];
    if (!result) return null;

    return {
      available:     true,
      stock_level:   'in_stock',
      price:         parseFloat(result.price?.replace(/[^0-9.]/g, '')) || null,
      product_name:  result.title || null,
      product_image: result.thumbnail || null,
    };
  } catch (err) {
    console.error('SerpApi error:', err.message);
    return null;
  }
}

// ── Main export: orchestrate all store searches ────────────────────
async function searchStores({ ingredients, lat, lng, radius_miles }) {
  const allResults = [];

  // Run Kroger + Walmart searches in parallel
  const storeSearches = ingredients.map(ingredient =>
    Promise.all([
      searchKroger({ ingredient, lat, lng }),
      searchWalmart({ ingredient, lat, lng }),
    ])
  );

  const settled = await Promise.allSettled(storeSearches);

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      const [krogerResults, walmartResults] = result.value;
      allResults.push(...krogerResults, ...walmartResults);
    }
  }

  // Also grab nearby stores from Google Places
  // (adds stores that aren't Kroger/Walmart chains)
  const googleStores = await searchNearbyGroceryStores(lat, lng);

  // For stores only found in Google (not Kroger/Walmart), use SerpApi
  const googleOnlyStores = googleStores.filter(gs =>
    !allResults.some(r => r.store_lat === gs.store_lat && r.store_lng === gs.store_lng)
  );

  for (const googleStore of googleOnlyStores.slice(0, 2)) {
    for (const ingredient of ingredients.slice(0, 5)) { // limit SerpApi calls
      const serpResult = await searchViaSerpApi({
        ingredient,
        storeId: googleStore.store_id,
        storeName: googleStore.store_name,
      });
      if (serpResult) {
        allResults.push({
          ingredient: ingredient.toLowerCase(),
          ...googleStore,
          ...serpResult,
        });
      }
    }
  }

  return allResults;
}

module.exports = { searchStores, searchNearbyGroceryStores };
