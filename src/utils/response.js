export function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

export function paginate(rows, { page = 1, limit = 20, total }) {
  return {
    items: rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      pages: Math.ceil(total / limit) || 1,
    },
  };
}
