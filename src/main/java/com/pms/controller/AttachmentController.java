package com.pms.controller;

import com.pms.entity.Attachment;
import com.pms.repository.AttachmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/attachments")
@CrossOrigin(origins = "http://localhost:5173")
public class AttachmentController {

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Value("${pms.upload.dir:./pms-uploads}")
    private String uploadDir;

    private Path fileStorageLocation;

    @PostConstruct
    public void init() {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("無法建立檔案存放目錄！", ex);
        }
    }

    // 取得某實體的附件清單 (只回傳 Metadata)
    @GetMapping
    public ResponseEntity<List<Attachment>> getAttachments(
            @RequestParam String targetType,
            @RequestParam String targetId) {
        List<Attachment> list = attachmentRepository.findByTargetTypeAndTargetIdOrderByUploadedAtDesc(targetType, targetId);
        return ResponseEntity.ok(list);
    }

    // 上傳附件
    @PostMapping
    public ResponseEntity<?> uploadAttachment(
            @RequestParam("file") MultipartFile file,
            @RequestParam("targetType") String targetType,
            @RequestParam("targetId") String targetId,
            @RequestParam(value = "uploaderId", required = false) String uploaderId) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("檔案不可為空！");
        }

        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null) originalFileName = "unknown";
        
        // 為了避免檔名衝突，產生存檔的唯一名稱
        String extension = "";
        int dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = originalFileName.substring(dotIndex);
        }
        String storedFileName = UUID.randomUUID().toString() + extension;

        try {
            // 將檔案存入實體硬碟
            Path targetLocation = this.fileStorageLocation.resolve(storedFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // 儲存 Metadata 進入資料庫
            Attachment attachment = new Attachment();
            attachment.setTargetType(targetType);
            attachment.setTargetId(targetId);
            attachment.setOriginalFileName(originalFileName);
            attachment.setFileName(storedFileName);
            attachment.setFileType(file.getContentType());
            attachment.setFileSize(file.getSize());
            attachment.setFilePath(targetLocation.toString());
            attachment.setUploadedBy(uploaderId != null ? uploaderId : "System");

            Attachment saved = attachmentRepository.save(attachment);
            return ResponseEntity.ok(saved);

        } catch (IOException ex) {
            return ResponseEntity.internalServerError().body("檔案儲存失敗: " + ex.getMessage());
        }
    }

    // 下載附件
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long id) {
        if (id == null) return ResponseEntity.badRequest().build();
        Attachment attachment = attachmentRepository.findById(id).orElse(null);
        if (attachment == null || attachment.getFileName() == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path filePath = this.fileStorageLocation.resolve(attachment.getFileName()).normalize();
            java.net.URI fileUri = filePath.toUri();
            Resource resource = new UrlResource(java.util.Objects.requireNonNull(fileUri));
            String contentType = attachment.getFileType();
            if (contentType == null) contentType = "application/octet-stream";

            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.getOriginalFileName() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException ex) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // 刪除附件
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAttachment(@PathVariable Long id) {
        if (id == null) return ResponseEntity.badRequest().build();
        return attachmentRepository.findById(id).map(attachment -> {
            try {
                // 從實體硬碟刪除
                Path filePath = Paths.get(attachment.getFilePath());
                Files.deleteIfExists(filePath);
            } catch (IOException e) {
                System.err.println("無法刪除實體檔案: " + e.getMessage());
            }

            // 從資料庫刪除記錄
            attachmentRepository.delete(attachment);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
