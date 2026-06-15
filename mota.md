Dự án: Hệ thống RAG hỗ trợ xây dựng đề thi tự động từ tài liệu học tập (Edu-RAG Exam Generator) Đối tượng sử dụng chính: Giáo viên, Giảng viên, Nghiên cứu sinh sư phạm.
1. Đặt vấn đề & Bối cảnh (Problem Statement)
Trong ngành giáo dục, việc biên soạn đề thi, bài kiểm tra định kỳ tiêu tốn rất nhiều thời gian của giáo viên. Để đảm bảo tính khách quan và bám sát chương trình, giáo viên phải dựa hoàn toàn vào các tài liệu chuẩn (sách giáo khoa, giáo trình, bài giảng PDF riêng).
Tuy nhiên, việc soạn đề thủ công gặp các hạn chế:
Tốn thời gian: Trung bình mất từ 2–5 giờ để thiết kế một đề thi chuẩn kèm đáp án chi tiết.
Rủi ro sai sót: Việc sao chép nội dung, tạo các phương án nhiễu (distractors) cho câu hỏi trắc nghiệm dễ bị trùng lặp hoặc thiếu tính logic nếu làm thủ công khi mệt mỏi.
Hạn chế của AI đại trà (ChatGPT, Gemini phiên bản chat công cộng): Khi giáo viên yêu cầu tạo đề, các LLM này thường tự "bịa" ra kiến thức nằm ngoài chương trình học (Hallucination), hoặc sử dụng các thuật ngữ chưa được dạy, dẫn đến việc đề thi không hợp lệ.
👉 Giải pháp: Xây dựng một hệ thống Retrieval-Augmented Generation (RAG) đóng vai trò như một trợ lý cô lập, chỉ cho phép AI tìm kiếm và trích xuất câu hỏi từ chính kho tài liệu PDF được giáo viên cung cấp.
2. Mục tiêu dự án & Phạm vi (Scope & Objectives)
Mục tiêu: Phát triển một ứng dụng web mini cho phép giáo viên tải lên tài liệu học tập (PDF), ra lệnh cho AI sinh đề thi (Trắc nghiệm/Tự luận) theo cấu trúc yêu cầu, cho phép chỉnh sửa trực tiếp và xuất file Word/PDF hoàn chỉnh theo chuẩn sư phạm.
Nguyên tắc cốt lõi (Strict Constraint): Không sử dụng kiến thức bên ngoài của LLM. Mọi câu hỏi phải có nguồn gốc (provenance) rõ ràng từ tài liệu gốc.
3. Phân tích giải pháp & Cơ sở tối ưu (Cập nhật xu hướng & Nghiên cứu)
Để dự án này vượt trội hơn các công cụ RAG thông thường, chúng ta áp dụng các kỹ thuật tối ưu từ các nghiên cứu gần đây:
A. Chống ảo tưởng bằng "Strict Context-Grounding" và "Self-RAG"
Vấn đề: RAG thông thường vẫn có thể bị AI bỏ qua ngữ cảnh và tự chế đáp án nếu prompt lỏng lẻo.
Giải pháp tối ưu: Áp dụng tư tưởng của nghiên cứu Self-RAG (Learning to Retrieve, Generate, and Critique) [1]. Hệ thống sẽ bắt LLM thực hiện bước phản biện (Critique): Sau khi sinh câu hỏi, LLM phải tự đối chiếu lại với đoạn văn bản gốc (Context), nếu phát hiện có từ ngữ hoặc logic nào không nằm trong tài liệu, hệ thống tự động hủy và sinh lại.
Trích nguồn nghiên cứu tham khảo:
[1] Asai, A., Wu, Z., Wang, Y., Pang, C., & Hajishirzi, H. (2023). Self-RAG: Learning to Retrieve, Generate, and Critique with Self-Reflection. arXiv preprint arXiv:2310.11511.
B. Xử lý hình ảnh trong tài liệu (Multimodal PDF Processing)
Vấn đề: Ý tưởng gốc muốn AI tự vẽ hình. Tuy nhiên, việc sinh hình ảnh hình học hoặc sơ đồ kỹ thuật bằng các mô hình Text-to-Image (DALL-E, Midjourney) thường không chính xác về mặt số liệu toán học/khoa học.
Giải pháp tối ưu: Thay vì vẽ mới, ta sử dụng cách tiếp cận Vision-Language RAG (Xu hướng phổ biến từ cuối năm 2024 - 2026 nhờ các mô hình như GPT-4o hay Gemini 1.5 Pro/Flash). Khi đọc file PDF, hệ thống sẽ sử dụng các thư viện như PyMuPDF (fitz) hoặc bộ phân tách cấu trúc Layout để trích xuất trực tiếp các hình ảnh (Charts, Diagrams, Hình hình học) cùng với tọa độ của chúng [2]. Khi câu hỏi được sinh ra từ đoạn văn bản gần hình ảnh đó, hình ảnh sẽ được tự động đính kèm vào câu hỏi.
Trích nguồn công nghệ tham khảo:
[2] Thư viện mã nguồn mở Marker hoặc LayoutParser hỗ trợ phân tích định dạng tài liệu số, giữ nguyên cấu trúc bảng biểu và hình ảnh thay vì chỉ đọc text thuần túy.
C. Kỹ thuật sinh phương án nhiễu (Distractor Generation)
Vấn đề: AI thường tạo ra các phương án sai (B, C, D) quá lộ liễu, khiến câu hỏi trắc nghiệm quá dễ.
Giải pháp tối ưu: Prompt sẽ ép AI sử dụng các "khái niệm gần đúng" xuất hiện trong các chương khác của cùng tài liệu để làm phương án nhiễu, tăng độ thách thức cho đề thi.

