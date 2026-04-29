package notes

import (
	"testing"

	teanotesv1 "notea/api/proto/teanotes/v1"
)

func TestToDBTeawareType(t *testing.T) {
	tests := []struct {
		name string
		in   teanotesv1.TeawareType
		want string
	}{
		{name: "teapot", in: teanotesv1.TeawareType_TEAWARE_TYPE_TEAPOT, want: "teapot"},
		{name: "gaiwan", in: teanotesv1.TeawareType_TEAWARE_TYPE_GAIWAN, want: "gaiwan"},
		{name: "cup", in: teanotesv1.TeawareType_TEAWARE_TYPE_CUP, want: "cup"},
		{name: "pitcher", in: teanotesv1.TeawareType_TEAWARE_TYPE_PITCHER, want: "pitcher"},
		{name: "aroma-cup", in: teanotesv1.TeawareType_TEAWARE_TYPE_AROMA_CUP, want: "aroma-cup"},
		{name: "thermos", in: teanotesv1.TeawareType_TEAWARE_TYPE_THERMOS, want: "thermos"},
		{name: "other for unspecified", in: teanotesv1.TeawareType_TEAWARE_TYPE_UNSPECIFIED, want: "other"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := toDBTeawareType(tc.in)
			if got != tc.want {
				t.Fatalf("toDBTeawareType(%v) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestToProtoTeawareType(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want teanotesv1.TeawareType
	}{
		{name: "teapot", in: "teapot", want: teanotesv1.TeawareType_TEAWARE_TYPE_TEAPOT},
		{name: "gaiwan", in: "gaiwan", want: teanotesv1.TeawareType_TEAWARE_TYPE_GAIWAN},
		{name: "cup", in: "cup", want: teanotesv1.TeawareType_TEAWARE_TYPE_CUP},
		{name: "pitcher", in: "pitcher", want: teanotesv1.TeawareType_TEAWARE_TYPE_PITCHER},
		{name: "aroma-cup", in: "aroma-cup", want: teanotesv1.TeawareType_TEAWARE_TYPE_AROMA_CUP},
		{name: "thermos", in: "thermos", want: teanotesv1.TeawareType_TEAWARE_TYPE_THERMOS},
		{name: "trim and lower", in: "  CuP  ", want: teanotesv1.TeawareType_TEAWARE_TYPE_CUP},
		{name: "unknown to other", in: "bowl", want: teanotesv1.TeawareType_TEAWARE_TYPE_OTHER},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := toProtoTeawareType(tc.in)
			if got != tc.want {
				t.Fatalf("toProtoTeawareType(%q) = %v, want %v", tc.in, got, tc.want)
			}
		})
	}
}
