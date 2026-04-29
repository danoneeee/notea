package notes

import (
	"testing"

	teanotesv1 "notea/api/proto/teanotes/v1"
)

func TestDescriptorCatalogStructure(t *testing.T) {
	if len(descriptorCatalog) == 0 {
		t.Fatalf("descriptorCatalog is empty")
	}

	categoryIDs := make(map[string]struct{}, len(descriptorCatalog))
	segmentIDs := map[string]struct{}{}
	descriptorIDs := map[string]struct{}{}

	descriptorCount := 0
	for _, category := range descriptorCatalog {
		if category.GetId() == "" || category.GetName() == "" {
			t.Fatalf("category has empty id/name: %+v", category)
		}
		if len(category.GetSegments()) == 0 {
			t.Fatalf("category %q has no segments", category.GetId())
		}
		if _, ok := categoryIDs[category.GetId()]; ok {
			t.Fatalf("duplicate category id: %q", category.GetId())
		}
		categoryIDs[category.GetId()] = struct{}{}

		for _, seg := range category.GetSegments() {
			if seg.GetId() == "" || seg.GetName() == "" {
				t.Fatalf("segment has empty id/name in category %q", category.GetId())
			}
			segKey := category.GetId() + "/" + seg.GetId()
			if _, ok := segmentIDs[segKey]; ok {
				t.Fatalf("duplicate segment id in category: %q", segKey)
			}
			segmentIDs[segKey] = struct{}{}

			if len(seg.GetDescriptors()) == 0 {
				t.Fatalf("segment %q has no descriptors", segKey)
			}
			for _, d := range seg.GetDescriptors() {
				if d.GetId() == "" || d.GetName() == "" {
					t.Fatalf("descriptor has empty id/name in segment %q", segKey)
				}
				if d.GetType() != teanotesv1.DescriptorType_DESCRIPTOR_TYPE_BOTH {
					t.Fatalf("descriptor %q has type %v, want BOTH", d.GetId(), d.GetType())
				}
				if _, ok := descriptorIDs[d.GetId()]; ok {
					t.Fatalf("duplicate descriptor id: %q", d.GetId())
				}
				descriptorIDs[d.GetId()] = struct{}{}
				descriptorCount++
			}
		}
	}

	if descriptorCount < 20 {
		t.Fatalf("descriptor catalog seems too small: got %d", descriptorCount)
	}
}
