export const templateRepository = {
  async findAll() {
    return [
      {
        id: 'tmpl-cgcn-1a',
        code: 'Mẫu 1a-TT.CGCN',
        title: 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu',
        category: 'Đào tạo & Tri thức',
        fileName: 'mau_1a_chuan.docx',
        active: true,
      },
      {
        id: 'tmpl-cgcn-2a',
        code: 'Mẫu 2a-KH.CGCN',
        title: 'Kế hoạch tổ chức chuyển giao công nghệ trong trường',
        category: 'Khoa học Công nghệ',
        fileName: 'mau_2a_chuan.docx',
        active: true,
      },
    ];
  },

  async findById(id) {
    const all = await this.findAll();
    return all.find((t) => t.id === id || t.code === id) || null;
  },

  async save(tmpl) {
    return tmpl;
  },
};
