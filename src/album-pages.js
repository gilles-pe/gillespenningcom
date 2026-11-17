// A portrait stands alone; consecutive landscapes share a page in pairs.
export function albumPages(photos) {
  const pages = [];
  let pair = [];
  const flush = () => { if (pair.length) { pages.push(pair); pair = []; } };
  photos.forEach((photo, index) => {
    const item = { ...photo, index };
    if (photo.orientation === 'portrait') {
      flush();
      pages.push([item]);
    } else {
      pair.push(item);
      if (pair.length === 2) flush();
    }
  });
  flush();
  return pages;
}
