export class PaginationMeta {
  constructor({ totalRecords = 0, currentPage = 1, pageSize = 20 } = {}) {
    this.totalRecords = Math.max(0, Number(totalRecords) || 0);
    this.currentPage = Math.max(1, Number(currentPage) || 1);
    this.pageSize = Math.max(1, Number(pageSize) || 20);
    this.totalPages = Math.ceil(this.totalRecords / this.pageSize) || 1;
    this.hasNextPage = this.currentPage < this.totalPages;
    this.hasPrevPage = this.currentPage > 1;
  }
}

export default PaginationMeta;

